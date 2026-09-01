package com.wellnessapp;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wellnessapp.entity.User;
import com.wellnessapp.repository.MealRepository;
import com.wellnessapp.repository.UserRepository;
import com.wellnessapp.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class MemberAccessApiIntegrationTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JwtTokenProvider tokens;
    @Autowired UserRepository users;
    @Autowired MealRepository meals;
    @Autowired ZoneId applicationZoneId;

    @Test
    void adminCanGrantAndUserCanReadButCannotAdminister() throws Exception {
        User aarav = user("user@mr-care.app");
        User kavya = user("kavya.menon@example.com");
        String adminToken = token("admin@mr-care.app", "ROLE_ADMIN");
        String userToken = token(aarav.getEmail(), "ROLE_USER");

        mvc.perform(put("/api/admin/member-access/{viewerId}", aarav.getId())
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("memberIds", List.of(kavya.getId())))))
                .andExpect(status().isForbidden());

        mvc.perform(put("/api/admin/member-access/{viewerId}", aarav.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsBytes(Map.of("memberIds", List.of(kavya.getId())))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedCount").value(1))
                .andExpect(jsonPath("$.assignedMembers[0].name").value("Kavya Menon"));

        mvc.perform(get("/api/shared-members").header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.members[0].id").value(kavya.getId()));

        User rohan = user("rohan.das@example.com");
        mvc.perform(get("/api/shared-members/{memberId}/today", rohan.getId())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void reactNativeStyleTextMetadataPartCreatesMealPost() throws Exception {
        User aarav = user("user@mr-care.app");
        Long mealId = meals.findByUserIdAndMealDateOrderByMealTime(
                aarav.getId(), LocalDate.now(applicationZoneId)).getFirst().getId();
        byte[] metadata = objectMapper.writeValueAsBytes(Map.of(
                "plannedMealId", mealId,
                "mealType", "Breakfast",
                "mealName", "Oats and fruit",
                "calories", 410,
                "proteinGrams", 24,
                "carbsGrams", 55,
                "fatGrams", 12,
                "clientRequestId", "mock-multipart-request"));
        MockMultipartFile metadataPart = new MockMultipartFile(
                "metadata", "", MediaType.TEXT_PLAIN_VALUE, metadata);
        MockMultipartFile imagePart = new MockMultipartFile(
                "image", "meal.png", MediaType.IMAGE_PNG_VALUE,
                new byte[] {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1});

        mvc.perform(multipart("/api/meal-posts")
                        .file(metadataPart)
                        .file(imagePart)
                        .header("Authorization", "Bearer " + token(aarav.getEmail(), "ROLE_USER")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.plannedMealId").value(mealId))
                .andExpect(jsonPath("$.imageUrl").isNotEmpty());
    }

    @Test
    void onlyAdministratorsCanOpenMemberJournals() throws Exception {
        User aarav = user("user@mr-care.app");
        String userToken = token(aarav.getEmail(), "ROLE_USER");
        String adminToken = token("admin@mr-care.app", "ROLE_ADMIN");

        mvc.perform(get("/api/admin/users/{memberId}/journal", aarav.getId())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());

        mvc.perform(get("/api/admin/users/{memberId}/journal", aarav.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.member.name").value("Aarav Mehta"))
                .andExpect(jsonPath("$.member.bmi").isNumber())
                .andExpect(jsonPath("$.today.member.id").value(aarav.getId()))
                .andExpect(jsonPath("$.retentionDays").value(21));
    }

    @Test
    void memberCanUploadProfilePhotoAndAdministratorCanViewIt() throws Exception {
        User aarav = user("user@mr-care.app");
        String userToken = token(aarav.getEmail(), "ROLE_USER");
        String adminToken = token("admin@mr-care.app", "ROLE_ADMIN");
        MockMultipartFile image = new MockMultipartFile(
                "image", "avatar.png", MediaType.IMAGE_PNG_VALUE,
                new byte[] {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1});

        mvc.perform(multipart("/api/profile/photo")
                        .file(image)
                        .with(request -> { request.setMethod("PUT"); return request; })
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profileImageUrl").value("/api/profile/photo"));

        mvc.perform(get("/api/profile/photo")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG));

        mvc.perform(get("/api/admin/users/{memberId}/profile-photo", aarav.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG));

        mvc.perform(get("/api/admin/users")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + aarav.getId() + ")].profileImageUrl").value(hasItem("/api/admin/users/" + aarav.getId() + "/profile-photo")));
    }

    private User user(String email) { return users.findByEmailIgnoreCase(email).orElseThrow(); }

    private String token(String email, String role) {
        var authentication = new UsernamePasswordAuthenticationToken(
                email, null, List.of(new SimpleGrantedAuthority(role)));
        return tokens.generate(authentication);
    }
}
