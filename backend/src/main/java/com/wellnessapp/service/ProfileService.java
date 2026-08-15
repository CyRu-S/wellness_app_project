package com.wellnessapp.service;
import com.wellnessapp.dto.profile.ProfileResponse;
import com.wellnessapp.entity.*;
import com.wellnessapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
@Service @RequiredArgsConstructor public class ProfileService {
    private final UserRepository users; private final UserProfileRepository profiles;
    public ProfileResponse get(String email) { User user = users.findByEmailIgnoreCase(email).orElseThrow(); UserProfile profile = profiles.findByUserId(user.getId()).orElse(null); return new ProfileResponse(user.getId(), user.getFullName(), user.getEmail(), user.getRole().name(), profile == null ? null : profile.getGoal(), profile == null ? null : profile.getHeightCm(), profile == null ? null : profile.getWeightKg(), profile == null ? null : profile.getDietaryPreferences()); }
}

