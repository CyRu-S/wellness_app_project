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
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MemberAccessService {
    private final UserRepository users;
    private final MemberAccessGrantRepository grants;
    private final MealRepository meals;
    private final MealPostRepository mealPosts;
    private final WaterLogRepository waterLogs;
    private final ActivitySessionRepository activities;
    private final Clock clock;
    private final ZoneId applicationZoneId;

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

        grants.deleteAll(grants.findByViewerIdOrderBySubjectFullName(viewerId));
        grants.flush();
        List<MemberAccessGrant> replacements = memberIds.stream()
                .map(subjects::get)
                .map(subject -> MemberAccessGrant.builder().viewer(viewer).subject(subject).grantedBy(admin).build())
                .toList();
        List<MemberAccessGrant> saved = replacements.isEmpty() ? List.of() : grants.saveAllAndFlush(replacements);
        return viewerResponse(viewer, saved.stream().sorted(Comparator.comparing(item -> item.getSubject().getFullName())).toList());
    }

    @Transactional(readOnly = true)
    public SharedMembersResponse sharedMembers(String viewerEmail) {
        User viewer = user(viewerEmail, "Account not found");
        if (!isEligible(viewer)) return new SharedMembersResponse(0, List.of());

        List<SharedMembersResponse.SharedMemberSummary> members = grants.findByViewerIdOrderBySubjectFullName(viewer.getId())
                .stream()
                .map(MemberAccessGrant::getSubject)
                .filter(this::isEligible)
                .map(subject -> summary(buildToday(subject)))
                .toList();
        return new SharedMembersResponse(members.size(), members);
    }

    @Transactional(readOnly = true)
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

    @Transactional(readOnly = true)
    public SharedMemberTodayResponse adminMemberToday(Long memberId) {
        User subject = users.findById(memberId)
                .filter(user -> user.getRole() == User.Role.USER)
                .orElseThrow(() -> new NotFoundException("Member not found"));
        return buildToday(subject);
    }

    public boolean canReadMember(User viewer, Long subjectId) {
        if (viewer.getStatus() != User.Status.ACTIVE) return false;
        User subject = users.findById(subjectId).filter(this::isEligible).orElse(null);
        if (subject == null) return false;
        if (viewer.getRole() == User.Role.ADMIN) return true;
        if (!isEligible(viewer)) return false;
        return Objects.equals(viewer.getId(), subjectId)
                || grants.existsByViewerIdAndSubjectId(viewer.getId(), subjectId);
    }

    private SharedMemberTodayResponse buildToday(User subject) {
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
        mealEntries.sort(Comparator.comparing(entry -> entry.postedAt() != null
                ? entry.postedAt()
                : date.atTime(entry.scheduledTime() == null ? LocalTime.MIDNIGHT : entry.scheduledTime()).atZone(applicationZoneId).toInstant()));

        int completed = (int) mealEntries.stream().filter(SharedMemberTodayResponse.MealEntry::completed).count();
        int calories = mealEntries.stream().filter(SharedMemberTodayResponse.MealEntry::completed)
                .map(SharedMemberTodayResponse.MealEntry::nutrition).filter(Objects::nonNull)
                .mapToInt(SharedMemberTodayResponse.Nutrition::calories).sum();
        int protein = mealEntries.stream().filter(SharedMemberTodayResponse.MealEntry::completed)
                .map(SharedMemberTodayResponse.MealEntry::nutrition).filter(Objects::nonNull)
                .mapToInt(SharedMemberTodayResponse.Nutrition::proteinGrams).sum();
        int hydration = water.stream().mapToInt(WaterLog::getAmountMl).sum();
        int activityMinutes = activity.stream().mapToInt(item -> item.getDurationSeconds() / 60).sum();

        SharedMemberTodayResponse.Summary summary = new SharedMemberTodayResponse.Summary(
                planned.size(), completed, posts.size(), calories, protein, hydration, activityMinutes);
        return new SharedMemberTodayResponse(
                new SharedMemberTodayResponse.Member(subject.getId(), subject.getFullName()),
                date,
                applicationZoneId.getId(),
                summary,
                List.copyOf(mealEntries),
                water.stream().map(item -> new SharedMemberTodayResponse.WaterEntry(item.getId(), item.getAmountMl(), item.getLoggedAt())).toList(),
                activity.stream().map(item -> new SharedMemberTodayResponse.ActivityEntry(
                        item.getId(), item.getActivity(), item.getDurationSeconds() / 60, item.getDistanceKm(), item.getStartedAt())).toList());
    }

    private SharedMemberTodayResponse.MealEntry mealEntry(Meal meal, MealPost post) {
        boolean completed = meal.isConsumed() || post != null;
        SharedMemberTodayResponse.Nutrition nutrition = post == null
                ? new SharedMemberTodayResponse.Nutrition(meal.getCalories(), meal.getProteinGrams(), 0, 0)
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
                summary.mealPosts(), summary.calories(), summary.proteinGrams(), summary.hydrationMl(), summary.activityMinutes());
    }

    private AdminMemberAccessResponse.ViewerAccess viewerResponse(User viewer, List<MemberAccessGrant> assigned) {
        List<AdminMemberAccessResponse.Member> members = assigned.stream()
                .filter(grant -> isEligible(grant.getSubject()))
                .map(grant -> new AdminMemberAccessResponse.Member(grant.getSubject().getId(), grant.getSubject().getFullName()))
                .toList();
        Instant lastGrantedAt = assigned.stream().map(MemberAccessGrant::getGrantedAt)
                .filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);
        return new AdminMemberAccessResponse.ViewerAccess(viewer.getId(), viewer.getFullName(), members.size(), members, lastGrantedAt);
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
