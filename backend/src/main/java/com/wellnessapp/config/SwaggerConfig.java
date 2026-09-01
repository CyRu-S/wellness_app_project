package com.wellnessapp.config;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.*;
import org.springframework.context.annotation.*;
@Configuration public class SwaggerConfig {
    @Bean OpenAPI wellnessApi() { return new OpenAPI().info(new Info().title("Mr_Care API").version("v1").description("REST API for daily wellness plans, meals, activity and administration.")).addSecurityItem(new SecurityRequirement().addList("bearerAuth")).components(new io.swagger.v3.oas.models.Components().addSecuritySchemes("bearerAuth", new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT"))); }
}

