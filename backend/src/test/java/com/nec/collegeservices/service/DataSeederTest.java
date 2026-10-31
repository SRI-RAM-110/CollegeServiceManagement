package com.nec.collegeservices.service;

import com.nec.collegeservices.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DataSeederTest {

    @Mock
    private SeminarHallRepository hallRepository;

    @Mock
    private AccommodationRoomRepository roomRepository;

    @Mock
    private VehicleRepository vehicleRepository;

    @Mock
    private StationeryItemRepository itemRepository;

    @InjectMocks
    private DataSeeder dataSeeder;

    @Test
    @DisplayName("DataSeeder: Never overwrites existing records if collections already contain data")
    void testDataSeederDoesNotOverwriteExistingData() {
        when(hallRepository.count()).thenReturn(5L);
        when(roomRepository.count()).thenReturn(4L);
        when(vehicleRepository.count()).thenReturn(3L);
        when(itemRepository.count()).thenReturn(8L);

        dataSeeder.run();

        verify(hallRepository, never()).saveAll(any());
        verify(roomRepository, never()).saveAll(any());
        verify(vehicleRepository, never()).saveAll(any());
        verify(itemRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("DataSeeder: Only populates defaults when count == 0")
    void testDataSeederPopulatesWhenEmpty() {
        when(hallRepository.count()).thenReturn(0L);
        when(roomRepository.count()).thenReturn(0L);
        when(vehicleRepository.count()).thenReturn(0L);
        when(itemRepository.count()).thenReturn(0L);

        dataSeeder.run();

        verify(hallRepository, times(1)).saveAll(any());
        verify(roomRepository, times(1)).saveAll(any());
        verify(vehicleRepository, times(1)).saveAll(any());
        verify(itemRepository, times(1)).saveAll(any());
    }
}

