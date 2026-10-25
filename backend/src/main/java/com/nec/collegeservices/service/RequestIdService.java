package com.nec.collegeservices.service;

import com.nec.collegeservices.model.RequestIdSequence;
import com.nec.collegeservices.model.User;
import jakarta.annotation.PostConstruct;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class RequestIdService {

    private static final Logger logger = LoggerFactory.getLogger(RequestIdService.class);

    private static final Pattern ID_PATTERN = Pattern.compile("^[A-Za-z0-9]+-(SEM|ACC|TRN|STA|MEAL)-(\\d{4,})(?:-\\d+)?$");

    @Autowired
    private MongoTemplate mongoTemplate;

    @PostConstruct
    public void initializeSequences() {
        syncSequenceFromCollection("SEM", "seminar_bookings", "bookingId");
        syncSequenceFromCollection("ACC", "accommodation_requests", "requestId");
        syncSequenceFromCollection("TRN", "transport_requests", "requestId");
        syncSequenceFromCollection("STA", "stationery_requests", "requestId");
        syncSequenceFromCollection("MEAL", "meal_requests", "requestId");
    }

    private void syncSequenceFromCollection(String serviceCode, String collectionName, String idField) {
        try {
            long maxFound = 0;
            if (mongoTemplate.collectionExists(collectionName)) {
                for (Document doc : mongoTemplate.getCollection(collectionName).find()) {
                    Object val = doc.get(idField);
                    if (val instanceof String strVal) {
                        Matcher m = ID_PATTERN.matcher(strVal.trim());
                        if (m.matches() && serviceCode.equalsIgnoreCase(m.group(1))) {
                            try {
                                long num = Long.parseLong(m.group(2));
                                if (num > maxFound) {
                                    maxFound = num;
                                }
                            } catch (NumberFormatException ignored) {
                            }
                        }
                    }
                }
            }

            RequestIdSequence existing = mongoTemplate.findById(serviceCode, RequestIdSequence.class);
            if (existing == null) {
                mongoTemplate.save(new RequestIdSequence(serviceCode, maxFound));
                logger.info("Initialized sequence for {} at {}", serviceCode, maxFound);
            } else if (existing.getSeq() < maxFound) {
                existing.setSeq(maxFound);
                mongoTemplate.save(existing);
                logger.info("Updated sequence for {} to match highest existing ID: {}", serviceCode, maxFound);
            }
        } catch (Exception e) {
            logger.error("Error synchronizing sequence for {}: {}", serviceCode, e.getMessage(), e);
        }
    }

    public String resolveDepartmentPrefix(User user, String fallbackDept) {
        if (user != null) {
            if (user.hasRole("AO_ADMIN") || user.hasRole("CREATOR") || "AO_ADMIN".equalsIgnoreCase(user.getRole())) {
                return "AO";
            }
            if (user.getDepartment() != null && !user.getDepartment().isBlank()) {
                String d = user.getDepartment().trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
                if ("ADMIN".equals(d)) {
                    return "AO";
                }
                return d;
            }
        }
        if (fallbackDept != null && !fallbackDept.isBlank()) {
            String d = fallbackDept.trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
            if ("ADMIN".equals(d)) {
                return "AO";
            }
            return d;
        }
        return "REQ";
    }

    public String generateRequestId(String serviceCode, User user, String fallbackDept) {
        String prefix = resolveDepartmentPrefix(user, fallbackDept);
        long seq = getNextSequence(serviceCode);
        return String.format("%s-%s-%04d", prefix, serviceCode, seq);
    }

    public String generateSeriesId(String serviceCode, User user, String fallbackDept) {
        String prefix = resolveDepartmentPrefix(user, fallbackDept);
        long seq = getNextSequence(serviceCode + "_SERIES");
        return String.format("%s-%s-SERIES-%04d", prefix, serviceCode, seq);
    }

    public String generateParentRequestId(String serviceCode, User user, String fallbackDept) {
        String prefix = resolveDepartmentPrefix(user, fallbackDept);
        long seq = getNextSequence(serviceCode + "_PARENT");
        return String.format("%s-%s-PARENT-%04d", prefix, serviceCode, seq);
    }

    public long getNextSequence(String scopeKey) {
        Query query = new Query(Criteria.where("_id").is(scopeKey));
        Update update = new Update().inc("seq", 1);
        FindAndModifyOptions options = FindAndModifyOptions.options().returnNew(true).upsert(true);
        RequestIdSequence counter = mongoTemplate.findAndModify(query, update, options, RequestIdSequence.class);
        return counter != null ? counter.getSeq() : 1L;
    }
}
