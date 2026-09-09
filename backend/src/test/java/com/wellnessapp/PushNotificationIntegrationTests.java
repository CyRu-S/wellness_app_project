package com.wellnessapp;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wellnessapp.entity.*;
import com.wellnessapp.repository.*;
import com.wellnessapp.security.JwtTokenProvider;
import com.wellnessapp.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.MediaType;
import java.io.IOException;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"app.demo.seed-enabled=false", "app.push.enabled=true", "app.schedulers.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:push;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE", "debug=false", "logging.level.root=WARN"})
@AutoConfigureMockMvc @Transactional
class PushNotificationIntegrationTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired PushDeviceRepository devices;
    @Autowired PushDeliveryRepository deliveries;
    @Autowired NotificationRepository events;
    @Autowired MealRepository meals;
    @Autowired MissedEventRepository missed;
    @Autowired PushAccountService accounts;
    @Autowired PushQueueService queue;
    @Autowired PushDeliveryWorker worker;
    @Autowired ReminderService reminders;
    @Autowired WorkflowNotificationService notices;
    @Autowired AuthService authentication;
    @Autowired PlanService plans;
    @Autowired ActivityService activity;
    @Autowired MemberAccessService access;
    @Autowired AdminWorkspaceService workspace;
    @Autowired JwtTokenProvider tokens;
    @MockitoBean ExpoPushClient expo;
    @MockitoBean Clock clock;
    final String pushToken = "ExponentPushToken[test-device]";
    final String registration = "a1111111-1111-4111-a111-111111111111";
    Instant now;
    User member;
    @BeforeEach void setup() {
        now = Instant.parse("2026-09-07T02:00:00Z"); advance(0);
        member = users.saveAndFlush(User.builder().email("push@example.com").fullName("Push Test").passwordHash("unused")
                .role(User.Role.USER).status(User.Status.ACTIVE).build());
    }
    void advance(long seconds) {
        now = now.plusSeconds(seconds);
        when(clock.instant()).thenReturn(now);
        doAnswer(a -> Clock.fixed(now, a.getArgument(0))).when(clock).withZone(any());
    }
    String auth(User user) { return "Bearer " + tokens.generate(user.getEmail(), "ROLE_" + user.getRole().name()); }
    User admin() {
        return users.saveAndFlush(User.builder().email("push-admin@example.com").fullName("Push Admin").passwordHash("unused")
                .role(User.Role.ADMIN).status(User.Status.ACTIVE).build());
    }
    long count(PushDelivery.Kind kind, User user) {
        return events.findAll().stream().filter(e -> e.getKind() == kind && e.getUser().getId().equals(user.getId())).count();
    }
    PushDelivery queuedTest() {
        accounts.register(member.getEmail(), pushToken, registration);
        var event = events.save(NotificationEvent.builder().user(member).title("Test").body("Private detail").scheduledAt(now).build());
        queue.enqueue(event, PushDelivery.Kind.TEST, now.plusSeconds(3600));
        return deliveries.findAll().getFirst();
    }
    @Test void authenticatedValidatedRegistrationAndPersistentPreferences() throws Exception {
        String body = json.writeValueAsString(Map.of("token", pushToken, "registrationId", registration));
        mvc.perform(put("/api/notifications/devices").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/notifications/devices").header("Authorization", auth(member)).contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"invalid\",\"registrationId\":\"invalid\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/notifications/devices").header("Authorization", auth(member)).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isNoContent());
        mvc.perform(put("/api/notifications/devices").header("Authorization", auth(member)).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isNoContent());
        assertThat(devices.count()).isEqualTo(1);
        mvc.perform(put("/api/notifications/preferences").header("Authorization", auth(member)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"mealReminders\":false,\"coachNudges\":true}")).andExpect(status().isOk()).andExpect(jsonPath("$.mealReminders").value(false));
        mvc.perform(get("/api/notifications/preferences").header("Authorization", auth(member))).andExpect(jsonPath("$.mealReminders").value(false)).andExpect(jsonPath("$.coachNudges").value(true));
    }
    @Test void pendingAccountCannotRegister() throws Exception {
        member.setStatus(User.Status.PENDING); users.saveAndFlush(member);
        mvc.perform(put("/api/notifications/devices").header("Authorization", auth(member)).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("token", pushToken, "registrationId", registration)))).andExpect(status().isUnauthorized());
    }
    @Test void ticketsAndReceiptsArePersistedAndPayloadDoesNotExposeHealthData() throws Exception {
        var row = queuedTest();
        when(expo.send(anyList())).thenAnswer(a -> {
            String payload = json.writeValueAsString(a.getArgument(0));
            assertThat(payload).contains("userId", "notificationId").doesNotContain("Private detail", member.getEmail());
            return json.readTree("[{\"status\":\"ok\",\"id\":\"receipt-1\"}]");
        });
        worker.sendPending(); worker.sendPending();
        assertThat(row.getStatus()).isEqualTo(PushDelivery.Status.RECEIPT);
        verify(expo, times(1)).send(anyList());
        advance(901);
        when(expo.receipts(anyList())).thenReturn(json.readTree("{\"receipt-1\":{\"status\":\"ok\"}}"));
        worker.checkReceipts(); assertThat(row.getStatus()).isEqualTo(PushDelivery.Status.DELIVERED);
    }
    @Test void retriesTransportFailureWithBackoffAndExpiresOldMessages() throws Exception {
        var row = queuedTest(); when(expo.send(anyList())).thenThrow(new IOException("offline"));
        worker.sendPending(); assertThat(row.getStatus()).isEqualTo(PushDelivery.Status.QUEUED);
        assertThat(row.getAttempts()).isEqualTo(1); assertThat(row.getNextAttemptAt()).isAfter(now);
        worker.sendPending(); verify(expo, times(1)).send(anyList());
        advance(3601); worker.sendPending(); assertThat(row.getStatus()).isEqualTo(PushDelivery.Status.CANCELLED);
    }
    @Test void invalidDeviceIsDisabled() throws Exception {
        var row = queuedTest();
        when(expo.send(anyList())).thenReturn(json.readTree("[{\"status\":\"error\",\"details\":{\"error\":\"DeviceNotRegistered\"}}]"));
        worker.sendPending(); assertThat(row.getStatus()).isEqualTo(PushDelivery.Status.FAILED); assertThat(row.getDevice().isEnabled()).isFalse();
    }
    @Test void logoutAndAccountSwitchCancelPreviouslyQueuedMessages() {
        var row = queuedTest();
        var other = users.saveAndFlush(User.builder().email("other-push@example.com").fullName("Other").passwordHash("unused").role(User.Role.USER).status(User.Status.ACTIVE).build());
        String newRegistration = UUID.randomUUID().toString();
        accounts.register(other.getEmail(), pushToken, newRegistration);
        accounts.unregister(member.getEmail(), pushToken, registration);
        assertThat(row.getDevice().isEnabled()).isTrue();
        worker.sendPending(); assertThat(row.getStatus()).isEqualTo(PushDelivery.Status.CANCELLED); verifyNoInteractions(expo);
        accounts.unregister(other.getEmail(), pushToken, newRegistration); assertThat(row.getDevice().isEnabled()).isFalse();
    }
    @Test void staleUnregisterCannotDisableNewSessionForSameUser() {
        var row = queuedTest(); accounts.register(member.getEmail(), pushToken, UUID.randomUUID().toString());
        accounts.unregister(member.getEmail(), pushToken, registration); assertThat(row.getDevice().isEnabled()).isTrue();
        worker.sendPending(); assertThat(row.getStatus()).isEqualTo(PushDelivery.Status.CANCELLED);
    }
    @Test void optingOutCancelsPendingCoachNudge() {
        accounts.register(member.getEmail(), pushToken, registration);
        var missedEvent = missed.save(MissedEvent.builder().user(member).itemType("Meals").itemTitle("Meal overdue").missedAt(now).build());
        reminders.nudge(missedEvent.getId()); reminders.nudge(missedEvent.getId());
        assertThat(deliveries.count()).isEqualTo(1);
        accounts.savePreferences(member.getEmail(), true, false);
        worker.sendPending(); assertThat(deliveries.findAll().getFirst().getStatus()).isEqualTo(PushDelivery.Status.CANCELLED); verifyNoInteractions(expo);
    }
    @Test void mealReminderQueuedOnceAndCancelledAfterLogging() {
        accounts.register(member.getEmail(), pushToken, registration);
        var meal = new Meal(); meal.setUser(member); meal.setType("Breakfast"); meal.setName("Oats");
        meal.setMealDate(LocalDate.of(2026, 9, 7)); meal.setMealTime(LocalTime.of(8, 0)); meals.saveAndFlush(meal);
        reminders.refresh(); reminders.refresh(); assertThat(deliveries.count()).isEqualTo(1);
        meal.setConsumed(true); meals.saveAndFlush(meal); worker.sendPending();
        assertThat(deliveries.findAll().getFirst().getStatus()).isEqualTo(PushDelivery.Status.CANCELLED); verifyNoInteractions(expo);
    }
    @Test void rescheduledMealCancelsOldReminder() {
        accounts.register(member.getEmail(), pushToken, registration);
        var meal = new Meal(); meal.setUser(member); meal.setType("Breakfast"); meal.setName("Oats");
        meal.setMealDate(LocalDate.of(2026, 9, 7)); meal.setMealTime(LocalTime.of(8, 0)); meals.saveAndFlush(meal);
        reminders.refresh(); meal.setMealTime(LocalTime.of(9, 0)); meals.saveAndFlush(meal); worker.sendPending();
        assertThat(deliveries.findAll().getFirst().getStatus()).isEqualTo(PushDelivery.Status.CANCELLED);
        advance(3600); reminders.refresh(); assertThat(deliveries.count()).isEqualTo(2);
    }
    @Test void testEndpointQueuesOnlyForCurrentUserAndHasCooldown() throws Exception {
        accounts.register(member.getEmail(), pushToken, registration);
        mvc.perform(post("/api/notifications/test").header("Authorization", auth(member))).andExpect(status().isAccepted());
        mvc.perform(post("/api/notifications/test").header("Authorization", auth(member))).andExpect(status().isTooManyRequests());
        assertThat(deliveries.count()).isEqualTo(1);
    }
    @Test void adminCanRegisterTestAndPersistAllPreferences() throws Exception {
        var admin = admin();
        mvc.perform(put("/api/notifications/devices").header("Authorization", auth(admin)).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("token", pushToken, "registrationId", registration)))).andExpect(status().isNoContent());
        mvc.perform(put("/api/notifications/preferences").header("Authorization", auth(admin)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"mealReminders\":true,\"coachNudges\":true,\"signupAlerts\":false,\"deadlineAlerts\":false,\"dailyDigest\":true,\"memberUpdates\":false,\"accountUpdates\":false}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/notifications/preferences").header("Authorization", auth(admin)))
                .andExpect(jsonPath("$.signupAlerts").value(false)).andExpect(jsonPath("$.deadlineAlerts").value(false))
                .andExpect(jsonPath("$.dailyDigest").value(true)).andExpect(jsonPath("$.memberUpdates").value(false));
        mvc.perform(post("/api/notifications/test").header("Authorization", auth(admin))).andExpect(status().isAccepted());
        assertThat(deliveries.findAll()).allMatch(d -> d.getNotification().getUser().getId().equals(admin.getId()));
    }
    @Test void registrationNotifiesAdminAndApprovalCancelsStalePush() {
        var admin = admin(); accounts.register(admin.getEmail(), pushToken, registration);
        authentication.register(new com.wellnessapp.dto.auth.RegisterRequest("Applicant", "applicant@example.com", "test-password", 25, 170, 65.0, "", ""));
        var applicant = users.findByEmailIgnoreCase("applicant@example.com").orElseThrow();
        assertThat(applicant.getStatus()).isEqualTo(User.Status.PENDING);
        assertThat(count(PushDelivery.Kind.SIGNUP, admin)).isEqualTo(1);
        workspace.decide(applicant.getId(), "APPROVE");
        assertThat(count(PushDelivery.Kind.APPROVAL, applicant)).isEqualTo(1);
        worker.sendPending();
        assertThat(deliveries.findAll()).hasSize(1).allMatch(d -> d.getStatus() == PushDelivery.Status.CANCELLED);
        verifyNoInteractions(expo);
    }
    @Test void overdueMealNotifiesAdminOnceAndResolutionCancelsDelivery() {
        var admin = admin(); accounts.register(admin.getEmail(), pushToken, registration);
        var meal = meals.saveAndFlush(Meal.builder().user(member).type("Breakfast").name("Oats")
                .mealDate(LocalDate.of(2026, 9, 7)).mealTime(LocalTime.of(6, 0)).build());
        reminders.refresh(); reminders.refresh();
        assertThat(count(PushDelivery.Kind.DEADLINE, admin)).isEqualTo(1);
        meal.setConsumed(true); meals.saveAndFlush(meal); reminders.refresh(); worker.sendPending();
        assertThat(deliveries.findAll()).hasSize(1).allMatch(d -> d.getStatus() == PushDelivery.Status.CANCELLED);
        verifyNoInteractions(expo);
    }
    @Test void dailyDigestIsOptInAndOnlyOnceInTheMorningWindow() {
        var admin = admin(); accounts.register(admin.getEmail(), pushToken, registration);
        advance(1800); notices.morningDigest(); assertThat(count(PushDelivery.Kind.DIGEST, admin)).isZero();
        accounts.savePreferences(admin.getEmail(), true, true, true, true, true, true, true);
        notices.morningDigest(); notices.morningDigest(); assertThat(count(PushDelivery.Kind.DIGEST, admin)).isEqualTo(1);
        advance(3600); notices.morningDigest(); assertThat(count(PushDelivery.Kind.DIGEST, admin)).isEqualTo(1);
        advance(23 * 3600); notices.morningDigest(); assertThat(count(PushDelivery.Kind.DIGEST, admin)).isEqualTo(2);
    }
    @Test void planAccessAndMovementCreateRecipientScopedNotices() {
        var admin = admin(); accounts.register(member.getEmail(), pushToken, registration);
        plans.save(member.getId(), new com.wellnessapp.dto.plan.SaveMealPlanRequest("Test plan", List.of(
                new com.wellnessapp.dto.plan.SaveMealPlanRequest.Item("Breakfast", "Oats", LocalTime.of(8, 0), 300, 10, List.of("Oats")))));
        assertThat(count(PushDelivery.Kind.PLAN, member)).isEqualTo(1);
        var subject = users.saveAndFlush(User.builder().email("shared@example.com").fullName("Shared").passwordHash("unused")
                .role(User.Role.USER).status(User.Status.ACTIVE).build());
        var grant = new com.wellnessapp.dto.access.ReplaceMemberAccessRequest(List.of(subject.getId()));
        access.replaceAssignments(admin.getEmail(), member.getId(), grant);
        access.replaceAssignments(admin.getEmail(), member.getId(), grant);
        assertThat(count(PushDelivery.Kind.ACCESS, member)).isEqualTo(1);
        access.replaceAssignments(admin.getEmail(), member.getId(), new com.wellnessapp.dto.access.ReplaceMemberAccessRequest(List.of()));
        assertThat(count(PushDelivery.Kind.ACCESS, member)).isEqualTo(2);
        activity.create(member.getEmail(), new com.wellnessapp.dto.activity.ActivityRequest("walk", 600, null));
        assertThat(count(PushDelivery.Kind.ACTIVITY, admin)).isEqualTo(1);
        assertThat(count(PushDelivery.Kind.ACTIVITY, member)).isZero();
    }
    @Test void mutedCategoriesKeepInboxHistoryWithoutQueuingPush() {
        var admin = admin(); accounts.register(admin.getEmail(), pushToken, registration);
        accounts.savePreferences(admin.getEmail(), true, true, false, false, false, false, true);
        for (var kind : List.of(PushDelivery.Kind.SIGNUP, PushDelivery.Kind.DEADLINE, PushDelivery.Kind.ACTIVITY, PushDelivery.Kind.MEAL_POST)) {
            notices.admins(kind, "muted-" + kind, "Test", "Details");
            assertThat(count(kind, admin)).isEqualTo(1);
        }
        assertThat(deliveries.count()).isZero();
    }
    @Test void inboxAndReadEndpointCannotAccessAnotherAccountsNotifications() throws Exception {
        var admin = admin(); notices.notify(admin, PushDelivery.Kind.TEST, "owner", "Admin only", "Private inbox detail");
        var event = events.findAll().stream().filter(e -> e.getUser().getId().equals(admin.getId())).findFirst().orElseThrow();
        mvc.perform(get("/api/notifications").header("Authorization", auth(member))).andExpect(content().json("[]"));
        mvc.perform(patch("/api/notifications/" + event.getId() + "/read").header("Authorization", auth(member))).andExpect(status().isNotFound());
        assertThat(event.isRead()).isFalse();
        mvc.perform(patch("/api/notifications/" + event.getId() + "/read").header("Authorization", auth(admin))).andExpect(status().isNoContent());
        assertThat(event.isRead()).isTrue();
    }
}
