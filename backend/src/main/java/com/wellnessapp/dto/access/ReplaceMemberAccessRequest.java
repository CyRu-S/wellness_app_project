package com.wellnessapp.dto.access;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ReplaceMemberAccessRequest(@NotNull List<@NotNull Long> memberIds) {}
