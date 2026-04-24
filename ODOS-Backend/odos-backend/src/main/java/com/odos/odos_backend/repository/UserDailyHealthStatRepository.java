package com.odos.odos_backend.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.odos.odos_backend.entity.UserDailyHealthStat;
import com.odos.odos_backend.entity.UserDailyHealthStatId;

public interface UserDailyHealthStatRepository extends JpaRepository<UserDailyHealthStat, UserDailyHealthStatId> {

    List<UserDailyHealthStat> findByUserIdAndActivityDateBetweenOrderByActivityDateDesc(
        UUID userId,
        LocalDate fromInclusive,
        LocalDate toInclusive
    );
}
