package com.nec.collegeservices.repository;

import com.nec.collegeservices.model.StationeryItem;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StationeryItemRepository extends MongoRepository<StationeryItem, String> {
    Optional<StationeryItem> findByItemId(String itemId);
    Optional<StationeryItem> findByItemIdIgnoreCase(String itemId);
    Optional<StationeryItem> findByNameIgnoreCase(String name);
    List<StationeryItem> findByCategory(String category);
    List<StationeryItem> findByActiveTrue();
    boolean existsByItemIdIgnoreCase(String itemId);
    boolean existsByNameIgnoreCase(String name);
}
