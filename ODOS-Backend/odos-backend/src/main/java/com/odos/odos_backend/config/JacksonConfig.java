package com.odos.odos_backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Spring Boot 4 + webmvc ile Jackson otomatik yapılandırması her ortamda ObjectMapper bean üretmeyebilir;
 * SavedRouteService vb. için açık bean.
 */
@Configuration
public class JacksonConfig {

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }
}
