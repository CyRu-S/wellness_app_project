package com.wellnessapp.service;

import com.wellnessapp.dto.access.*;
import com.wellnessapp.entity.*;
import com.wellnessapp.exception.BadRequestException;
import com.wellnessapp.exception.NotFoundException;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MemberAccessService {
    private static final int DEFAULT_WATER_GOAL_ML = 2000;
    private static final int DAILY_ACTIVITY_GOAL_MINUTES = 30;
    private static final int DAILY_ACTIVITY_GOAL_SECONDS = DAILY_ACTIVITY_GOAL_MINUTES * 60;
    private static final Duration NUDGE_COOLDOWN = Duration.ofMinutes(30);

    private final UserRepository users;
    private final MemberAccessGrantRepository grants;
    private final MealRepository meals;
    private final MealPostRepository mealPosts;
    private final WaterLogRepository waterLogs;
    private final ActivitySessionRepository activities;
    private final PlanItemCompletionRepository completions;
    private final NotificationRepository notifications;
    private final UserProfileRepository profiles;
    private final Clock clock;
    private final ZoneId applicationZoneId;
    private final PlanService plans;
    private final WorkflowNotificationService notices;

    @Transactional(readOnly = true)
    public AdminMemberAccessResponse adminOverview() {
        List<User> eligible = eligibleMembers();
        Map<Long, List<MemberAccessGrant>> grantsByViewer = grants.findAllByOrderByViewerFullNameAscSubjectFullNameAsc()
                .stream().collect(Collectors.groupingBy(item -> item.getViewer().getId()));
        List<AdminMemberAccessResponse.ViewerAccess> viewers = eligible.stream()
                .map(viewer -> viewerResponse(viewer, grantsByViewer.getOrDefault(viewer.getId(), List.of())))
                .toList();
        int total = viewers.stream().mapToInt(AdminMemberAccessResponse.ViewerAccess::assignedCount).sum();
        int withAccess = (int) viewers.stream().filter(viewer -> viewer.assignedCount() > 0).count();
        return new AdminMemberAccessResponse(total, withAccess, viewers);
    }

    @Transactional
    public AdminMemberAccessResponse.ViewerAccess replaceAssignments(
            String adminEmail, Long viewerId, ReplaceMemberAccessRequest request) {
        User admin = user(adminEmail, "Administrator not found");
        if (admin.getRole() != User.Role.ADMIN || admin.getStatus() != User.Status.ACTIVE) {
            throw new NotFoundException("Administrator not found");
        }
        User viewer = eligibleMember(viewerId, "Viewer not found");

        LinkedHashSet<Long> memberIds = new LinkedHashSet<>(request.memberIds());
        if (memberIds.contains(viewerId)) throw new BadRequestException("A member cannot be granted access to themself");

        Map<Long, User> subjects = users.findAllById(memberIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        if (subjects.size() != memberIds.size() || subjects.values().stream().anyMatch(subject -> !isEligible(subject))) {
            throw new BadRequestException("Every assigned member must be an active user");
        }

        users.lockById(viewerId).orElseThrow();
        var previousGrants = grants.findByViewerIdOrderBySubjectFullName(viewerId);
        var previousIds = previousGrants.stream().map(g -> g.getSubject().getId()).collect(Collectors.toSet());
        grants.deleteAll(previousGrants);
        grants.flush();
        List<MemberAccessGrant> replacements = memberIds.stream()
                .map(subjects::get)
                .map(subject -> MemberAccessGrant.builder().viewer(viewer).subject(subject).grantedBy(admin).build())
                .toList();
        List<MemberAccessGrant> saved = replacements.isEmpty() ? List.of() : grants.saveAllAndFlush(replacements);
        if (!previousIds.equals(memberIds)) notices.notify(viewer, PushDelivery.Kind.ACCESS, "access-" + UUID.randomUUID(),
                "Shared access updated", "Your admin has changed your shared member access. Open Shared to review your current access.");
        return viewerResponse(viewer, saved.stream().sorted(Comparator.comparing(item -> item.getSubject().getFullName())).toList());
    }

    @Transactional
    public SharedMembersResponse sharedMembers(String viewerEmail) {
        User viewer = user(viewerEmail, "Account not found");
        if (!isEligible(viewer)) return new SharedMembersResponse(0, false, List.of());

        List<User> subjects = grants.findByViewerIdOrderBySubjectFullName(viewer.getId()).stream()
                .map(MemberAccessGrant::getSubject).filter(this::isEligible).toList();
        List<SharedMembersResponse.SharedMemberSummary> members = sharedSummaries(subjects);
        return new SharedMembersResponse(members.size(), viewer.isCanAssignPlans(), members);
    }

    private List<SharedMembersResponse.SharedMemberSummary> sharedSummaries(List<User> subjects) {
        if (subjects.isEmpty()) return List.of();
        LocalDate date = LocalDate.now(clock.withZone(applicationZoneId));
        Instant start = date.atStartOfDay(applicationZoneId).toInstant();
        Instant end = date.plusDays(1).atStartOfDay(applicationZoneId).toInstant();
        Set<Long> memberIds = subjects.stream().map(User::getId).collect(Collectors.toCollection(LinkedHashSet::new));
        Map<Long, Map<String, Object>> planByMember = plans.memberPlans(memberIds);
        Map<Long, List<Meal>> mealsByMember = meals.findByUserIdInAndMealDateOrderByMealTime(memberIds, date).stream()
                .collect(Collectors.groupingBy(meal -> meal.getUser().getId()));
        Map<Long, Object[]> postByMember = rowsById(mealPosts.summariesForUsersBetween(memberIds, start, end));
        Map<Long, Integer> waterByMember = intTotals(waterLogs.totalsForUsersBetween(memberIds, start, end));
        Map<Long, Integer> activityByMember = intTotals(activities.totalsForUsersBetween(memberIds, start, end));
        Map<Long, Long> completedTasks = completions.findByUserIdInAndCompletedDate(memberIds, date).stream()
                .collect(Collectors.groupingBy(value -> value.getUser().getId(), Collectors.counting()));
        Map<Long, Integer> waterGoals = profiles.findByUserIdIn(memberIds).stream().collect(Collectors.toMap(
                profile -> profile.getUser().getId(), profile -> profile.getWaterGoalMl() > 0 ? profile.getWaterGoalMl() : DEFAULT_WATER_GOAL_ML));
        Set<Long> nudged = new HashSet<>(notifications.userIdsByKindAndUserIdInBetween(
                PushDelivery.Kind.NUDGE, memberIds, start, end));

        return subjects.stream().map(subject -> {
            Long id = subject.getId();
            Map<String, Object> plan = planByMember.getOrDefault(id, Map.of());
            int plannedMeals = ((List<?>) plan.getOrDefault("items", List.of())).size();
            int plannedTasks = ((List<?>) plan.getOrDefault("habits", List.of())).size()
                    + ((List<?>) plan.getOrDefault("exercises", List.of())).size();
            List<Meal> memberMeals = mealsByMember.getOrDefault(id, List.of());
            int completedMeals = (int) memberMeals.stream().filter(Meal::isConsumed).count();
            Object[] post = postByMember.get(id);
            int postCount = post == null ? 0 : ((Number) post[1]).intValue();
            BigDecimal calories = post == null || post[2] == null ? BigDecimal.ZERO : (BigDecimal) post[2];
            int protein = post == null || post[3] == null ? 0 : ((BigDecimal) post[3]).setScale(0, RoundingMode.HALF_UP).intValue();
            int hydration = waterByMember.getOrDefault(id, 0);
            int hydrationGoal = waterGoals.getOrDefault(id, DEFAULT_WATER_GOAL_ML);
            int activitySeconds = activityByMember.getOrDefault(id, 0);
            int taskCompletions = completedTasks.getOrDefault(id, 0L).intValue();
            int completion = dailyCompletion(plannedMeals, completedMeals, plannedTasks, taskCompletions,
                    hydration, hydrationGoal, activitySeconds);
            return new SharedMembersResponse.SharedMemberSummary(id, subject.getFullName(), plannedMeals,
                    completedMeals, postCount, calories, protein, hydration, hydrationGoal, activitySeconds / 60,
                    DAILY_ACTIVITY_GOAL_MINUTES, plannedTasks, taskCompletions, completion, nudged.contains(id));
        }).toList();
    }

    private Map<Long, Object[]> rowsById(List<Object[]> rows) {
        return rows.stream().collect(Collectors.toMap(row -> ((Number) row[0]).longValue(), Function.identity()));
    }

    private Map<Long, Integer> intTotals(List<Object[]> rows) {
        return rows.stream().collect(Collectors.toMap(row -> ((Number) row[0]).longValue(), row -> ((Number) row[1]).intValue()));
    }

    @Transactional
    public AdminMemberAccessResponse.ViewerAccess updatePlanPermission(
            String adminEmail, Long viewerId, boolean canAssignPlans) {
        User admin = user(adminEmail, "Administrator not found");
        if (admin.getRole() != User.Role.ADMIN || admin.getStatus() != User.Status.ACTIVE) {
            throw new NotFoundException("Administrator not found");
        }
        User viewer = users.lockById(viewerId).filter(this::isEligible)
                .orElseThrow(() -> new NotFoundException("Coach not found"));
        viewer.setCanAssignPlans(canAssignPlans);
        users.save(viewer);
        List<MemberAccessGrant> assigned = grants.findByViewerIdOrderBySubjectFullName(viewerId);
        notices.notify(viewer, PushDelivery.Kind.ACCESS, "plan-access-" + UUID.randomUUID(),
                canAssignPlans ? "Diet plan access enabled" : "Diet plan access removed",
                canAssignPlans
                        ? "Your admin has enabled diet plan assignment for your shared members."
                        : "Your admin has removed diet plan assignment access. Shared progress remains available.");
        return viewerResponse(viewer, assigned);
    }

    @Transactional
    public SharedMemberTodayResponse sharedMemberToday(String viewerEmail, Long memberId) {
        User viewer = user(viewerEmail, "Shared member not found");
        User subject = users.findById(memberId)
                .filter(this::isEligible)
                .orElseThrow(() -> new NotFoundException("Shared member not found"));
        boolean admin = viewer.getRole() == User.Role.ADMIN && viewer.getStatus() == User.Status.ACTIVE;
        if (!admin && (!isEligible(viewer) || !grants.existsByViewerIdAndSubjectId(viewer.getId(), subject.getId()))) {
            throw new NotFoundException("Shared member not found");
        }
        return buildToday(subject);
    }

    @Transactional
    public SharedMemberTodayResponse adminMemberToday(Long memberId) {
        User subject = users.findById(memberId)
                .filter(user -> user.getRole() == User.Role.USER)
                .orElseThrow(() -> new NotFoundException("Member not found"));
        return buildToday(subject);
    }

    public boolean canReadMember(User viewer, Long subjectId) {
        if (viewer.getStatus() != User.Status.ACTIVE) return false;
        User subject = users.findById(subjectId).filter(u -> u.getRole() == User.Role.USER).orElse(null);
        if (subject == null) return false;
        if (viewer.getRole() == User.Role.ADMIN) return true;
        if (!isEligible(viewer) || !isEligible(subject)) return false;
        return Objects.equals(viewer.getId(), subjectId)
                || grants.existsByViewerIdAndSubjectId(viewer.getId(), subjectId);
    }

    private SharedMemberTodayResponse buildToday(User subject) {
        plans.ensureDailyMeals(subject.getId());
        LocalDate date = LocalDate.now(clock.withZone(applicationZoneId));
        Instant start = date.atStartOfDay(applicationZoneId).toInstant();
        Instant end = date.plusDays(1).atStartOfDay(applicationZoneId).toInstant();

        List<Meal> planned = meals.findByUserIdAndMealDateOrderByMealTime(subject.getId(), date);
        List<MealPost> posts = mealPosts.findByUserIdAndPostedAtGreaterThanEqualAndPostedAtLessThanOrderByPostedAt(
                subject.getId(), start, end);
        List<WaterLog> water = waterLogs.findByUserIdAndLoggedAtGreaterThanEqualAndLoggedAtLessThanOrderByLoggedAt(
                subject.getId(), start, end);
        List<ActivitySession> activity = activities.findByUserIdAndStartedAtGreaterThanEqualAndStartedAtLessThanOrderByStartedAt(
                subject.getId(), start, end);
        Map<Long, PlanItemCompletion> completionByItem = completions.findByUserIdAndCompletedDate(subject.getId(), date).stream()
                .collect(Collectors.toMap(value -> value.getPlanItem().getId(), Function.identity()));
        List<SharedMemberTodayResponse.TaskEntry> tasks = plans.scheduledTasks(subject.getId()).stream().map(item -> {
            var completion = completionByItem.get(item.getId());
            return new SharedMemberTodayResponse.TaskEntry(item.getId(), item.getType().name(), item.getTitle(),
                    item.getDetail(), item.getScheduledTime(), completion != null,
                    completion == null ? null : completion.getCompletedAt());
        }).toList();

        Map<Long, MealPost> postByPlannedMeal = posts.stream()
                .filter(post -> post.getPlannedMeal() != null)
                .collect(Collectors.toMap(post -> post.getPlannedMeal().getId(), Function.identity(), (first, second) -> second));

        List<SharedMemberTodayResponse.MealEntry> mealEntries = new ArrayList<>();
        for (Meal meal : planned) {
            MealPost post = postByPlannedMeal.get(meal.getId());
            mealEntries.add(mealEntry(meal, post));
        }
        posts.stream()
                .filter(post -> post.getPlannedMeal() == null || planned.stream().noneMatch(meal -> meal.getId().equals(post.getPlannedMeal().getId())))
                .map(this::standaloneMealEntry)
                .forEach(mealEntries::add);
        mealEntries.sort(Comparator.comparing(entry -> entry.scheduledTime() != null
                ? date.atTime(entry.scheduledTime()).atZone(applicationZoneId).toInstant()
                : entry.postedAt()));

        int completed = (int) planned.stream().filter(meal -> meal.isConsumed() || postByPlannedMeal.containsKey(meal.getId())).count();
        BigDecimal calories = mealEntries.stream().filter(SharedMemberTodayResponse.MealEntry::completed)
                .map(SharedMemberTodayResponse.MealEntry::nutrition).filter(Objects::nonNull)
                .map(SharedMemberTodayResponse.Nutrition::calories)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        int protein = mealEntries.stream().filter(SharedMemberTodayResponse.MealEntry::completed)
                .map(SharedMemberTodayResponse.MealEntry::nutrition).filter(Objects::nonNull)
                .map(SharedMemberTodayResponse.Nutrition::proteinGrams)
                .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(0, RoundingMode.HALF_UP).intValueExact();
        int hydration = water.stream().mapToInt(WaterLog::getAmountMl).sum();
        int activitySeconds = activity.stream().mapToInt(ActivitySession::getDurationSeconds).sum();
        int activityMinutes = activitySeconds / 60;
        int hydrationGoal = profiles.findByUserId(subject.getId())
                .map(UserProfile::getWaterGoalMl)
                .filter(goal -> goal > 0)
                .orElse(DEFAULT_WATER_GOAL_ML);
        int completedTasks = (int) tasks.stream().filter(SharedMemberTodayResponse.TaskEntry::completed).count();
        int completionPercentage = dailyCompletion(planned.size(), completed, tasks.size(), completedTasks,
                hydration, hydrationGoal, activitySeconds);

        SharedMemberTodayResponse.Summary summary = new SharedMemberTodayResponse.Summary(
                planned.size(), completed, posts.size(), calories, protein, hydration, hydrationGoal,
                activityMinutes, DAILY_ACTIVITY_GOAL_MINUTES, tasks.size(), completedTasks, completionPercentage);
        List<SharedMemberTodayResponse.NudgeOption> nudges = nudgeOptions(subject, summary, tasks);
        return new SharedMemberTodayResponse(
                new SharedMemberTodayResponse.Member(subject.getId(), subject.getFullName()),
                date,
                applicationZoneId.getId(),
                summary,
                nudges.stream().anyMatch(option -> option.lastSentAt() != null),
                nudges,
                List.copyOf(mealEntries),
                tasks,
                water.stream().map(item -> new SharedMemberTodayResponse.WaterEntry(item.getId(), item.getAmountMl(), item.getLoggedAt())).toList(),
                activity.stream().map(item -> new SharedMemberTodayResponse.ActivityEntry(
                        item.getId(), item.getActivity(), item.getDurationSeconds() / 60, item.getDistanceKm(), item.getStartedAt())).toList());
    }

    private List<SharedMemberTodayResponse.NudgeOption> nudgeOptions(
            User subject,
            SharedMemberTodayResponse.Summary summary,
            List<SharedMemberTodayResponse.TaskEntry> tasks) {
        long pendingHabits = tasks.stream()
                .filter(task -> "HEALTHY_HABIT".equals(task.type()) && !task.completed())
                .count();
        long pendingExercises = tasks.stream()
                .filter(task -> "ACTIVITY".equals(task.type()) && !task.completed())
                .count();
        int mealsRemaining = Math.max(0, summary.plannedMeals() - summary.completedMeals());
        int waterRemaining = Math.max(0, summary.hydrationGoalMl() - summary.hydrationMl());
        int moveRemaining = Math.max(0, summary.activityGoalMinutes() - summary.activityMinutes());

        return List.of(
                nudgeOption(subject, MemberNudgeType.MEALS, "Meals",
                        mealsRemaining == 0 ? "Completed for today" : mealsRemaining + " assigned meal" + (mealsRemaining == 1 ? "" : "s") + " remaining",
                        mealsRemaining > 0),
                nudgeOption(subject, MemberNudgeType.HYDRATION, "Hydration",
                        waterRemaining == 0 ? "Daily water goal completed" : waterRemaining + " ml remaining",
                        waterRemaining > 0),
                nudgeOption(subject, MemberNudgeType.EXERCISE, "Move",
                        pendingExercises > 0 ? pendingExercises + " coach exercise" + (pendingExercises == 1 ? "" : "s") + " remaining"
                                : moveRemaining == 0 ? "Movement goal completed" : moveRemaining + " movement minutes remaining",
                        pendingExercises > 0 || moveRemaining > 0),
                nudgeOption(subject, MemberNudgeType.HABITS, "To-do",
                        pendingHabits == 0 ? "Checklist completed for today" : pendingHabits + " checklist item" + (pendingHabits == 1 ? "" : "s") + " remaining",
                        pendingHabits > 0));
    }

    private SharedMemberTodayResponse.NudgeOption nudgeOption(
            User subject, MemberNudgeType type, String title, String detail, boolean needed) {
        Instant lastSentAt = subject.getLastNudgedAt();
        if (lastSentAt != null && !lastSentAt.plus(NUDGE_COOLDOWN).isAfter(clock.instant())) lastSentAt = null;
        return new SharedMemberTodayResponse.NudgeOption(
                type, title, detail, needed, lastSentAt,
                lastSentAt == null ? null : lastSentAt.plus(NUDGE_COOLDOWN));
    }

    private SharedMemberTodayResponse.MealEntry mealEntry(Meal meal, MealPost post) {
        boolean completed = meal.isConsumed() || post != null;
        SharedMemberTodayResponse.Nutrition nutrition = post == null
                ? new SharedMemberTodayResponse.Nutrition(BigDecimal.valueOf(meal.getCalories()), BigDecimal.valueOf(meal.getProteinGrams()), BigDecimal.ZERO, BigDecimal.ZERO)
                : nutrition(post);
        return new SharedMemberTodayResponse.MealEntry(
                meal.getId(), post == null ? null : post.getId(), meal.getType(), meal.getName(), meal.getMealTime(),
                post == null ? null : post.getPostedAt(), completed,
                post == null ? null : imageUrl(post.getId()), nutrition);
    }

    private SharedMemberTodayResponse.MealEntry standaloneMealEntry(MealPost post) {
        return new SharedMemberTodayResponse.MealEntry(
                null, post.getId(), post.getMealType(), post.getMealName(), null, post.getPostedAt(), true,
                imageUrl(post.getId()), nutrition(post));
    }

    private SharedMemberTodayResponse.Nutrition nutrition(MealPost post) {
        return new SharedMemberTodayResponse.Nutrition(
                post.getCalories(), post.getProteinGrams(), post.getCarbsGrams(), post.getFatGrams());
    }

    private SharedMembersResponse.SharedMemberSummary summary(SharedMemberTodayResponse response) {
        SharedMemberTodayResponse.Summary summary = response.summary();
        return new SharedMembersResponse.SharedMemberSummary(
                response.member().id(), response.member().name(), summary.plannedMeals(), summary.completedMeals(),
                summary.mealPosts(), summary.calories(), summary.proteinGrams(), summary.hydrationMl(),
                summary.hydrationGoalMl(), summary.activityMinutes(), summary.activityGoalMinutes(),
                summary.plannedTasks(), summary.completedTasks(), summary.completionPercentage(), response.nudgedToday());
    }

    private int dailyCompletion(int plannedMeals, int completedMeals, int plannedTasks, int completedTasks,
                                int hydrationMl, int hydrationGoalMl, int activitySeconds) {
        double expected = plannedMeals + plannedTasks + 2.0;
        double earned = completedMeals + completedTasks
                + Math.min(1.0, hydrationMl * 1.0 / hydrationGoalMl)
                + Math.min(1.0, activitySeconds * 1.0 / DAILY_ACTIVITY_GOAL_SECONDS);
        return (int) Math.min(100, Math.round(earned * 100.0 / expected));
    }

    private AdminMemberAccessResponse.ViewerAccess viewerResponse(User viewer, List<MemberAccessGrant> assigned) {
        List<AdminMemberAccessResponse.Member> members = assigned.stream()
                .filter(grant -> isEligible(grant.getSubject()))
                .map(grant -> new AdminMemberAccessResponse.Member(grant.getSubject().getId(), grant.getSubject().getFullName()))
                .toList();
        Instant lastGrantedAt = assigned.stream().map(MemberAccessGrant::getGrantedAt)
                .filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);
        return new AdminMemberAccessResponse.ViewerAccess(viewer.getId(), viewer.getFullName(), viewer.isCanAssignPlans(), members.size(), members, lastGrantedAt);
    }

    private List<User> eligibleMembers() {
        return users.findByRoleAndStatusOrderByFullName(User.Role.USER, User.Status.ACTIVE);
    }

    private User eligibleMember(Long id, String message) {
        return users.findById(id).filter(this::isEligible).orElseThrow(() -> new NotFoundException(message));
    }

    private boolean isEligible(User user) {
        return user.getRole() == User.Role.USER && user.getStatus() == User.Status.ACTIVE;
    }

    private User user(String email, String message) {
        return users.findByEmailIgnoreCase(email).orElseThrow(() -> new NotFoundException(message));
    }

    private String imageUrl(Long postId) { return "/api/meal-posts/" + postId + "/image"; }
}
