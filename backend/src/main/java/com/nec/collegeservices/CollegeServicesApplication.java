package com.nec.collegeservices;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

@SpringBootApplication
@EnableMongoAuditing
public class CollegeServicesApplication {
    public static void main(String[] args) {
        SpringApplication.run(CollegeServicesApplication.class, args);
    }
}
