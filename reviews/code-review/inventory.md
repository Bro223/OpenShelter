# INVENTORY — lane split for the readability-and-simplification pass

**Lane:** INVENTORY (read-only; this file is the only artifact)
**Branch:** `code-review` · **Standard:** `docs/autopilot/CODE-REVIEW-RUN.md`
**Method:** `wc -l` over every file, `find` for structure, pattern scans for nesting depth,
history-tone comments and oversized methods. No test suites were run (other lanes gate).

Repo totals (lines): backend main **31,456** across 358 files,
backend test **39,888** across 184 files,
frontend `frontend/src/app/**` **63,999** across 217 files, plus
**1,175** more across the 7 bootstrap files directly under `frontend/src/` (owned by
`FE-APP-ROOT` and `FE-STYLES`) — frontend grand total **65,174** across 224 files.

**Out of scope by rule 5 (never touched by any lane):**
- **33 applied migrations** in `src/main/resources/db/migration/` (`V1` … `V33` Flyway SQL) — append-only, count only.
- 2 Java files in `ee/sheltermap/migration/` (`V13PiiEncryptionMigration` 223 lines + 19) — the applied programmatic PII-encryption migration.
- `frontend/src/vendor/**` (vendored Quill), `docs/skills/**`.

---

## 1. Source files by size

### 1a. Backend main — `src/main/java/**` (358 files, 31,456 lines)

| Lines | Path |
|---:|---|
| 1063 | `src/main/java/ee/sheltermap/guidance/GuidanceService.java` |
| 887 | `src/main/java/ee/sheltermap/api/ShelterQueryService.java` |
| 756 | `src/main/java/ee/sheltermap/api/AdminModerationService.java` |
| 753 | `src/main/java/ee/sheltermap/api/AdminGuidanceController.java` |
| 552 | `src/main/java/ee/sheltermap/api/ShelterController.java` |
| 515 | `src/main/java/ee/sheltermap/api/ApiErrorHandler.java` |
| 509 | `src/main/java/ee/sheltermap/app/ShelterService.java` |
| 498 | `src/main/java/ee/sheltermap/api/AdminController.java` |
| 449 | `src/main/java/ee/sheltermap/guidance/HeroImageImportService.java` |
| 411 | `src/main/java/ee/sheltermap/guidance/MarkdownToHtml.java` |
| 407 | `src/main/java/ee/sheltermap/app/ShelterReportService.java` |
| 377 | `src/main/java/ee/sheltermap/guidance/MediaImageInspector.java` |
| 370 | `src/main/java/ee/sheltermap/guidance/MediaService.java` |
| 365 | `src/main/java/ee/sheltermap/auth/ContactChangeService.java` |
| 332 | `src/main/java/ee/sheltermap/persistence/JpaShelterRepository.java` |
| 329 | `src/main/java/ee/sheltermap/config/SecurityConfig.java` |
| 325 | `src/main/java/ee/sheltermap/persistence/ShelterEntity.java` |
| 324 | `src/main/java/ee/sheltermap/api/ShelterDto.java` |
| 320 | `src/main/java/ee/sheltermap/domain/GuidancePost.java` |
| 319 | `src/main/java/ee/sheltermap/guidance/MediaDerivatives.java` |
| 315 | `src/main/java/ee/sheltermap/persistence/JpaUserRepository.java` |
| 291 | `src/main/java/ee/sheltermap/ingestion/CsvRegistryClient.java` |
| 284 | `src/main/java/ee/sheltermap/auth/PasswordResetService.java` |
| 277 | `src/main/java/ee/sheltermap/verification/VerificationService.java` |
| 276 | `src/main/java/ee/sheltermap/ingestion/ShelterImportService.java` |
| 273 | `src/main/java/ee/sheltermap/auth/AccountController.java` |
| 268 | `src/main/java/ee/sheltermap/config/OpenApiConfig.java` |
| 261 | `src/main/java/ee/sheltermap/guidance/GuidanceOrderingService.java` |
| 260 | `src/main/java/ee/sheltermap/auth/AuthController.java` |
| 259 | `src/main/java/ee/sheltermap/domain/Shelter.java` |
| 255 | `src/main/java/ee/sheltermap/guidance/JdkHeroImageFetchClient.java` |
| 249 | `src/main/java/ee/sheltermap/app/LocationResolveService.java` |
| 234 | `src/main/java/ee/sheltermap/api/GuidanceController.java` |
| 233 | `src/main/java/ee/sheltermap/guidance/MediaStorage.java` |
| 223 | `src/main/java/ee/sheltermap/migration/V13PiiEncryptionMigration.java` |
| 208 | `src/main/java/ee/sheltermap/persistence/GuidancePostEntity.java` |
| 202 | `src/main/java/ee/sheltermap/app/MapsUrlCoordinates.java` |
| 202 | `src/main/java/ee/sheltermap/api/AdminMediaController.java` |
| 185 | `src/main/java/ee/sheltermap/auth/AccountService.java` |
| 184 | `src/main/java/ee/sheltermap/security/PiiCrypto.java` |
| 181 | `src/main/java/ee/sheltermap/verification/FileVerificationSendLog.java` |
| 181 | `src/main/java/ee/sheltermap/auth/AuthService.java` |
| 177 | `src/main/java/ee/sheltermap/auth/VerificationController.java` |
| 171 | `src/main/java/ee/sheltermap/ingestion/RegistryCsvParser.java` |
| 169 | `src/main/java/ee/sheltermap/verification/TwilioSmsSender.java` |
| 167 | `src/main/java/ee/sheltermap/persistence/UserEntity.java` |
| 159 | `src/main/java/ee/sheltermap/domain/GuidanceTranslation.java` |
| 156 | `src/main/java/ee/sheltermap/persistence/ModerationActionEntity.java` |
| 155 | `src/main/java/ee/sheltermap/persistence/JpaShelterReportRepository.java` |
| 154 | `src/main/java/ee/sheltermap/api/MediaController.java` |
| 151 | `src/main/java/ee/sheltermap/app/ModerationAuditLog.java` |
| 149 | `src/main/java/ee/sheltermap/domain/PublicGuidanceView.java` |
| 148 | `src/main/java/ee/sheltermap/domain/ShelterReport.java` |
| 143 | `src/main/java/ee/sheltermap/alerts/ThrottleAlertRecorder.java` |
| 142 | `src/main/java/ee/sheltermap/persistence/JpaGuidanceTranslationRepository.java` |
| 142 | `src/main/java/ee/sheltermap/guidance/GuidanceValidation.java` |
| 141 | `src/main/java/ee/sheltermap/persistence/JpaGuidancePostRepository.java` |
| 140 | `src/main/java/ee/sheltermap/verification/RollingContactOtpLimiter.java` |
| 140 | `src/main/java/ee/sheltermap/sitetexts/SiteTextsService.java` |
| 138 | `src/main/java/ee/sheltermap/persistence/MediaAssetEntity.java` |
| 137 | `src/main/java/ee/sheltermap/app/UserRepository.java` |
| 135 | `src/main/java/ee/sheltermap/domain/User.java` |
| 134 | `src/main/java/ee/sheltermap/domain/MediaAsset.java` |
| 134 | `src/main/java/ee/sheltermap/auth/CurrentCaller.java` |
| 132 | `src/main/java/ee/sheltermap/api/Pagination.java` |
| 131 | `src/main/java/ee/sheltermap/persistence/UserMapper.java` |
| 127 | `src/main/java/ee/sheltermap/retention/RetentionService.java` |
| 127 | `src/main/java/ee/sheltermap/persistence/GuidanceTranslationEntity.java` |
| 124 | `src/main/java/ee/sheltermap/domain/RegisteredUser.java` |
| 123 | `src/main/java/ee/sheltermap/persistence/JpaMediaAssetRepository.java` |
| 120 | `src/main/java/ee/sheltermap/persistence/JpaModerationAuditLog.java` |
| 120 | `src/main/java/ee/sheltermap/auth/JwtTokenService.java` |
| 118 | `src/main/java/ee/sheltermap/guidance/SlugFactory.java` |
| 116 | `src/main/java/ee/sheltermap/persistence/ShelterReportEntity.java` |
| 116 | `src/main/java/ee/sheltermap/app/ShelterRepository.java` |
| 113 | `src/main/java/ee/sheltermap/persistence/ShelterInfoRequestEntity.java` |
| 112 | `src/main/java/ee/sheltermap/auth/AdminSeeder.java` |
| 112 | `src/main/java/ee/sheltermap/api/LocationController.java` |
| 111 | `src/main/java/ee/sheltermap/api/AdminShelterDto.java` |
| 110 | `src/main/java/ee/sheltermap/persistence/ShelterHistoryEntity.java` |
| 109 | `src/main/java/ee/sheltermap/persistence/PendingContactChangeEntity.java` |
| 109 | `src/main/java/ee/sheltermap/config/SecurityHeadersFilter.java` |
| 108 | `src/main/java/ee/sheltermap/auth/TokenBucketRateLimiter.java` |
| 106 | `src/main/java/ee/sheltermap/auth/PasswordResetToken.java` |
| 102 | `src/main/java/ee/sheltermap/sitetexts/SiteTextKeys.java` |
| 102 | `src/main/java/ee/sheltermap/persistence/VerificationClaimEntity.java` |
| 102 | `src/main/java/ee/sheltermap/persistence/DataImportEntity.java` |
| 99 | `src/main/java/ee/sheltermap/guidance/HeroAddressPolicy.java` |
| 99 | `src/main/java/ee/sheltermap/auth/ClientIps.java` |
| 99 | `src/main/java/ee/sheltermap/app/ShelterReportRepository.java` |
| 98 | `src/main/java/ee/sheltermap/persistence/PendingVerificationEntity.java` |
| 98 | `src/main/java/ee/sheltermap/persistence/PasswordResetTokenEntity.java` |
| 96 | `src/main/java/ee/sheltermap/verification/EmailVerificationProvider.java` |
| 95 | `src/main/java/ee/sheltermap/persistence/JpaShelterInfoRequestLog.java` |
| 93 | `src/main/java/ee/sheltermap/persistence/JpaPasswordResetTokenRepository.java` |
| 93 | `src/main/java/ee/sheltermap/guidance/GuidancePostRepository.java` |
| 93 | `src/main/java/ee/sheltermap/api/EmailTestController.java` |
| 92 | `src/main/java/ee/sheltermap/persistence/JpaShelterOpenStatusReportRepository.java` |
| 90 | `src/main/java/ee/sheltermap/api/SmsTestController.java` |
| 89 | `src/main/java/ee/sheltermap/config/JwtAuthenticationFilter.java` |
| 89 | `src/main/java/ee/sheltermap/config/DataSourceCredentialGuard.java` |
| 88 | `src/main/java/ee/sheltermap/verification/PhoneVerificationProvider.java` |
| 87 | `src/main/java/ee/sheltermap/app/ShelterHistoryChanges.java` |
| 86 | `src/main/java/ee/sheltermap/persistence/JpaPendingContactChangeRepository.java` |
| 85 | `src/main/java/ee/sheltermap/persistence/JpaShelterOccupancyReportRepository.java` |
| 83 | `src/main/java/ee/sheltermap/persistence/JpaReportActionLog.java` |
| 83 | `src/main/java/ee/sheltermap/domain/VerificationClaim.java` |
| 82 | `src/main/java/ee/sheltermap/verification/SmtpPulseSmtpSender.java` |
| 82 | `src/main/java/ee/sheltermap/persistence/ShelterOpenStatusReportEntity.java` |
| 82 | `src/main/java/ee/sheltermap/persistence/RefreshTokenEntity.java` |
| 81 | `src/main/java/ee/sheltermap/persistence/ShelterOccupancyReportEntity.java` |
| 81 | `src/main/java/ee/sheltermap/domain/Provenance.java` |
| 81 | `src/main/java/ee/sheltermap/auth/PendingContactChange.java` |
| 81 | `src/main/java/ee/sheltermap/api/AdminSiteTextController.java` |
| 80 | `src/main/java/ee/sheltermap/persistence/SiteTextEntity.java` |
| 78 | `src/main/java/ee/sheltermap/persistence/JpaPendingVerificationRepository.java` |
| 78 | `src/main/java/ee/sheltermap/guidance/GuidanceTranslationRepository.java` |
| 77 | `src/main/java/ee/sheltermap/verification/PendingVerification.java` |
| 77 | `src/main/java/ee/sheltermap/config/DevSenderGuard.java` |
| 75 | `src/main/java/ee/sheltermap/persistence/RetentionRunEntity.java` |
| 75 | `src/main/java/ee/sheltermap/config/ProdJwtGuard.java` |
| 73 | `src/main/java/ee/sheltermap/persistence/SpringDataShelterRepository.java` |
| 73 | `src/main/java/ee/sheltermap/ingestion/RegistryShelterParser.java` |
| 73 | `src/main/java/ee/sheltermap/guidance/BodySanitizer.java` |
| 73 | `src/main/java/ee/sheltermap/api/AdminGuidancePostDto.java` |
| 72 | `src/main/java/ee/sheltermap/persistence/JpaSiteTextRepository.java` |
| 72 | `src/main/java/ee/sheltermap/config/ApiDocsGuard.java` |
| 71 | `src/main/java/ee/sheltermap/ingestion/Lest97AxisOrder.java` |
| 70 | `src/main/java/ee/sheltermap/persistence/ReportActionEntity.java` |
| 70 | `src/main/java/ee/sheltermap/ingestion/RegistryProperties.java` |
| 70 | `src/main/java/ee/sheltermap/domain/SiteText.java` |
| 69 | `src/main/java/ee/sheltermap/app/ShelterInfoRequestLog.java` |
| 68 | `src/main/java/ee/sheltermap/security/PiiKeys.java` |
| 68 | `src/main/java/ee/sheltermap/persistence/SpringDataShelterReportRepository.java` |
| 68 | `src/main/java/ee/sheltermap/config/DevEndpointsGuard.java` |
| 67 | `src/main/java/ee/sheltermap/verification/CodeHashes.java` |
| 67 | `src/main/java/ee/sheltermap/persistence/SpringDataUserRepository.java` |
| 67 | `src/main/java/ee/sheltermap/api/SiteTextController.java` |
| 66 | `src/main/java/ee/sheltermap/guidance/GuidanceSearch.java` |
| 65 | `src/main/java/ee/sheltermap/app/ShelterHistoryLog.java` |
| 65 | `src/main/java/ee/sheltermap/app/HttpUrlRedirectClient.java` |
| 64 | `src/main/java/ee/sheltermap/guidance/MediaAssetRepository.java` |
| 64 | `src/main/java/ee/sheltermap/app/UserService.java` |
| 63 | `src/main/java/ee/sheltermap/persistence/UserCredentialsEntity.java` |
| 63 | `src/main/java/ee/sheltermap/domain/ShelterOpenStatusReport.java` |
| 63 | `src/main/java/ee/sheltermap/domain/ShelterOccupancyReport.java` |
| 63 | `src/main/java/ee/sheltermap/domain/ReporterTrust.java` |
| 63 | `src/main/java/ee/sheltermap/auth/UserCredentials.java` |
| 60 | `src/main/java/ee/sheltermap/persistence/JpaUserCredentialsRepository.java` |
| 59 | `src/main/java/ee/sheltermap/config/LoopbackXffTrustGuard.java` |
| 58 | `src/main/java/ee/sheltermap/verification/PhoneNumbers.java` |
| 58 | `src/main/java/ee/sheltermap/domain/AdminUser.java` |
| 58 | `src/main/java/ee/sheltermap/app/DataImportLog.java` |
| 57 | `src/main/java/ee/sheltermap/persistence/SpringDataGuidanceTranslationRepository.java` |
| 57 | `src/main/java/ee/sheltermap/api/DataSourceController.java` |
| 55 | `src/main/java/ee/sheltermap/persistence/JpaRefreshTokenRepository.java` |
| 55 | `src/main/java/ee/sheltermap/persistence/JpaDataImportLog.java` |
| 55 | `src/main/java/ee/sheltermap/ingestion/LEst97Transformer.java` |
| 54 | `src/main/java/ee/sheltermap/verification/VerificationSendLog.java` |
| 54 | `src/main/java/ee/sheltermap/api/SubmitterVerification.java` |
| 53 | `src/main/java/ee/sheltermap/config/FailClosedGuard.java` |
| 53 | `src/main/java/ee/sheltermap/auth/MeResponse.java` |
| 53 | `src/main/java/ee/sheltermap/api/AdminAccess.java` |
| 49 | `src/main/java/ee/sheltermap/persistence/JpaShelterHistoryLog.java` |
| 48 | `src/main/java/ee/sheltermap/persistence/SpringDataModerationActionRepository.java` |
| 48 | `src/main/java/ee/sheltermap/persistence/SpringDataGuidancePostRepository.java` |
| 48 | `src/main/java/ee/sheltermap/config/Profiles.java` |
| 48 | `src/main/java/ee/sheltermap/api/GuidancePostDto.java` |
| 47 | `src/main/java/ee/sheltermap/persistence/GuidancePostMapper.java` |
| 47 | `src/main/java/ee/sheltermap/guidance/HeroImageFetchClient.java` |
| 47 | `src/main/java/ee/sheltermap/app/ReporterTrustEvaluator.java` |
| 47 | `src/main/java/ee/sheltermap/api/AdminShelterReportDto.java` |
| 47 | `src/main/java/ee/sheltermap/api/AdminAuditDto.java` |
| 46 | `src/main/java/ee/sheltermap/auth/PasswordResetTokenRepository.java` |
| 45 | `src/main/java/ee/sheltermap/verification/VerificationConfig.java` |
| 45 | `src/main/java/ee/sheltermap/ingestion/DevRegistryClient.java` |
| 45 | `src/main/java/ee/sheltermap/api/AdminUserDto.java` |
| 44 | `src/main/java/ee/sheltermap/verification/SmartIdVerificationProvider.java` |
| 44 | `src/main/java/ee/sheltermap/retention/RetentionScheduler.java` |
| 42 | `src/main/java/ee/sheltermap/persistence/MediaAssetMapper.java` |
| 42 | `src/main/java/ee/sheltermap/ingestion/ImportResult.java` |
| 41 | `src/main/java/ee/sheltermap/app/ShelterSubmissionThrottledException.java` |
| 41 | `src/main/java/ee/sheltermap/app/CommaSeparated.java` |
| 40 | `src/main/java/ee/sheltermap/verification/VerificationThrottledException.java` |
| 40 | `src/main/java/ee/sheltermap/ingestion/ShelterRegistryClient.java` |
| 40 | `src/main/java/ee/sheltermap/domain/VerificationPolicy.java` |
| 40 | `src/main/java/ee/sheltermap/auth/DataExportResponse.java` |
| 40 | `src/main/java/ee/sheltermap/app/ShelterOpenStatusRepository.java` |
| 39 | `src/main/java/ee/sheltermap/persistence/GuidanceTranslationMapper.java` |
| 39 | `src/main/java/ee/sheltermap/config/RegistryScheduler.java` |
| 38 | `src/main/java/ee/sheltermap/verification/VerificationProvider.java` |
| 38 | `src/main/java/ee/sheltermap/domain/BoundingBox.java` |
| 38 | `src/main/java/ee/sheltermap/auth/Codes.java` |
| 38 | `src/main/java/ee/sheltermap/app/ReportActionLog.java` |
| 38 | `src/main/java/ee/sheltermap/api/CreateGuidancePostRequest.java` |
| 38 | `src/main/java/ee/sheltermap/api/AdminShelterHistoryDto.java` |
| 37 | `src/main/java/ee/sheltermap/domain/VerificationRules.java` |
| 37 | `src/main/java/ee/sheltermap/config/RateLimitProperties.java` |
| 36 | `src/main/java/ee/sheltermap/persistence/SpringDataVerificationClaimRepository.java` |
| 36 | `src/main/java/ee/sheltermap/app/RedirectClient.java` |
| 35 | `src/main/java/ee/sheltermap/security/Contacts.java` |
| 35 | `src/main/java/ee/sheltermap/persistence/SpringDataPasswordResetTokenRepository.java` |
| 35 | `src/main/java/ee/sheltermap/guidance/HeroAddressResolver.java` |
| 35 | `src/main/java/ee/sheltermap/auth/RateLimiter.java` |
| 35 | `src/main/java/ee/sheltermap/api/MediaAssetDto.java` |
| 35 | `src/main/java/ee/sheltermap/api/DataSourceDto.java` |
| 34 | `src/main/java/ee/sheltermap/persistence/SpringDataPendingContactChangeRepository.java` |
| 34 | `src/main/java/ee/sheltermap/auth/RegisterRequest.java` |
| 34 | `src/main/java/ee/sheltermap/auth/PendingContactChangeRepository.java` |
| 34 | `src/main/java/ee/sheltermap/api/UpdateShelterRequest.java` |
| 33 | `src/main/java/ee/sheltermap/auth/Argon2PasswordHasher.java` |
| 33 | `src/main/java/ee/sheltermap/api/AdminAlertDto.java` |
| 32 | `src/main/java/ee/sheltermap/sitetexts/SiteTextRepository.java` |
| 32 | `src/main/java/ee/sheltermap/retention/RetentionRunLog.java` |
| 32 | `src/main/java/ee/sheltermap/auth/Transactions.java` |
| 32 | `src/main/java/ee/sheltermap/api/UpdateGuidancePostRequest.java` |
| 32 | `src/main/java/ee/sheltermap/alerts/ThrottleAlert.java` |
| 31 | `src/main/java/ee/sheltermap/persistence/JpaRetentionRunLog.java` |
| 31 | `src/main/java/ee/sheltermap/ingestion/RegistryShelterDto.java` |
| 31 | `src/main/java/ee/sheltermap/ingestion/RegistryFetch.java` |
| 31 | `src/main/java/ee/sheltermap/config/MediaConfig.java` |
| 31 | `src/main/java/ee/sheltermap/app/ShelterOccupancyRepository.java` |
| 31 | `src/main/java/ee/sheltermap/api/SmsTestResult.java` |
| 30 | `src/main/java/ee/sheltermap/api/CreateShelterRequest.java` |
| 29 | `src/main/java/ee/sheltermap/persistence/SpringDataShelterOpenStatusReportRepository.java` |
| 29 | `src/main/java/ee/sheltermap/auth/RefreshTokenRepository.java` |
| 29 | `src/main/java/ee/sheltermap/auth/ContactChangeResult.java` |
| 29 | `src/main/java/ee/sheltermap/app/ReportThrottledException.java` |
| 28 | `src/main/java/ee/sheltermap/verification/DevSmtpSender.java` |
| 28 | `src/main/java/ee/sheltermap/verification/DevSmsSender.java` |
| 28 | `src/main/java/ee/sheltermap/guidance/MediaAssetInUseException.java` |
| 28 | `src/main/java/ee/sheltermap/auth/RateLimitExceededException.java` |
| 28 | `src/main/java/ee/sheltermap/api/EmailTestRequest.java` |
| 27 | `src/main/java/ee/sheltermap/persistence/SiteTextMapper.java` |
| 27 | `src/main/java/ee/sheltermap/auth/ProfileUpdateRequest.java` |
| 27 | `src/main/java/ee/sheltermap/app/ProvisionedAdminProtectedException.java` |
| 26 | `src/main/java/ee/sheltermap/persistence/SpringDataMediaAssetRepository.java` |
| 26 | `src/main/java/ee/sheltermap/guidance/HeroImportRefusedException.java` |
| 26 | `src/main/java/ee/sheltermap/app/AppInfo.java` |
| 25 | `src/main/java/ee/sheltermap/verification/PendingVerificationRepository.java` |
| 25 | `src/main/java/ee/sheltermap/guidance/HeroImportUnreachableException.java` |
| 25 | `src/main/java/ee/sheltermap/domain/GeoPoint.java` |
| 24 | `src/main/java/ee/sheltermap/persistence/SpringDataReportActionRepository.java` |
| 24 | `src/main/java/ee/sheltermap/guidance/DnsHeroAddressResolver.java` |
| 24 | `src/main/java/ee/sheltermap/domain/ReviewStatus.java` |
| 24 | `src/main/java/ee/sheltermap/config/RegistryRunConfig.java` |
| 24 | `src/main/java/ee/sheltermap/auth/PasswordResetConfirmRequest.java` |
| 24 | `src/main/java/ee/sheltermap/auth/Hashes.java` |
| 24 | `src/main/java/ee/sheltermap/app/ShelterLimitExceededException.java` |
| 24 | `src/main/java/ee/sheltermap/api/SmsTestRequest.java` |
| 24 | `src/main/java/ee/sheltermap/api/ShelterSourceFilter.java` |
| 24 | `src/main/java/ee/sheltermap/api/EmailTestResult.java` |
| 23 | `src/main/java/ee/sheltermap/verification/SmsSender.java` |
| 23 | `src/main/java/ee/sheltermap/verification/AlreadyVerifiedException.java` |
| 23 | `src/main/java/ee/sheltermap/persistence/SpringDataRefreshTokenRepository.java` |
| 23 | `src/main/java/ee/sheltermap/guidance/UnsupportedImageException.java` |
| 23 | `src/main/java/ee/sheltermap/guidance/SlugAlreadyUsedException.java` |
| 23 | `src/main/java/ee/sheltermap/app/ShelterDuplicateException.java` |
| 23 | `src/main/java/ee/sheltermap/api/CreateGuidanceTranslationRequest.java` |
| 22 | `src/main/java/ee/sheltermap/verification/SmtpSender.java` |
| 22 | `src/main/java/ee/sheltermap/verification/CodeSendFailedException.java` |
| 22 | `src/main/java/ee/sheltermap/retention/RetentionProperties.java` |
| 22 | `src/main/java/ee/sheltermap/persistence/SpringDataPendingVerificationRepository.java` |
| 22 | `src/main/java/ee/sheltermap/persistence/SpringDataDataImportRepository.java` |
| 22 | `src/main/java/ee/sheltermap/domain/GuestUser.java` |
| 22 | `src/main/java/ee/sheltermap/auth/TokenService.java` |
| 22 | `src/main/java/ee/sheltermap/auth/CodeSentDto.java` |
| 22 | `src/main/java/ee/sheltermap/api/GuidanceTranslationDto.java` |
| 21 | `src/main/java/ee/sheltermap/verification/VerificationProperties.java` |
| 21 | `src/main/java/ee/sheltermap/guidance/MediaTooLargeException.java` |
| 21 | `src/main/java/ee/sheltermap/auth/VerifyConfirmRequest.java` |
| 21 | `src/main/java/ee/sheltermap/app/TextTruncation.java` |
| 21 | `src/main/java/ee/sheltermap/ShelterMapApplication.java` |
| 20 | `src/main/java/ee/sheltermap/auth/ContactChangeProperties.java` |
| 19 | `src/main/java/ee/sheltermap/persistence/SpringDataShelterOccupancyReportRepository.java` |
| 19 | `src/main/java/ee/sheltermap/migration/PiiMigrationConfig.java` |
| 19 | `src/main/java/ee/sheltermap/ingestion/ShelterParser.java` |
| 19 | `src/main/java/ee/sheltermap/guidance/GuidanceNotFoundException.java` |
| 19 | `src/main/java/ee/sheltermap/domain/TextValidation.java` |
| 19 | `src/main/java/ee/sheltermap/auth/TokenResponse.java` |
| 19 | `src/main/java/ee/sheltermap/auth/DuplicateAccountException.java` |
| 19 | `src/main/java/ee/sheltermap/api/UpdateGuidanceTranslationRequest.java` |
| 19 | `src/main/java/ee/sheltermap/api/ReorderGuidanceRequest.java` |
| 19 | `src/main/java/ee/sheltermap/api/AttachGuidanceTranslationRequest.java` |
| 18 | `src/main/java/ee/sheltermap/ingestion/RegistryUnavailableException.java` |
| 18 | `src/main/java/ee/sheltermap/api/AdminShelterReviewRequest.java` |
| 17 | `src/main/java/ee/sheltermap/verification/CodePolicy.java` |
| 17 | `src/main/java/ee/sheltermap/persistence/SpringDataSiteTextRepository.java` |
| 17 | `src/main/java/ee/sheltermap/persistence/SpringDataShelterInfoRequestRepository.java` |
| 17 | `src/main/java/ee/sheltermap/persistence/SpringDataShelterHistoryRepository.java` |
| 17 | `src/main/java/ee/sheltermap/guidance/GuidanceValidationException.java` |
| 17 | `src/main/java/ee/sheltermap/domain/UserData.java` |
| 17 | `src/main/java/ee/sheltermap/domain/LocationKind.java` |
| 17 | `src/main/java/ee/sheltermap/auth/SuspendedAccountException.java` |
| 17 | `src/main/java/ee/sheltermap/app/ReportProperties.java` |
| 17 | `src/main/java/ee/sheltermap/api/PagingBoundsException.java` |
| 17 | `src/main/java/ee/sheltermap/api/LocationResolveRequest.java` |
| 16 | `src/main/java/ee/sheltermap/domain/ShelterReportType.java` |
| 16 | `src/main/java/ee/sheltermap/auth/UserCredentialsRepository.java` |
| 16 | `src/main/java/ee/sheltermap/auth/Tokens.java` |
| 16 | `src/main/java/ee/sheltermap/auth/LoginRequest.java` |
| 16 | `src/main/java/ee/sheltermap/app/NotAuthorException.java` |
| 16 | `src/main/java/ee/sheltermap/app/DuplicateReportException.java` |
| 16 | `src/main/java/ee/sheltermap/api/ShelterReportRequest.java` |
| 16 | `src/main/java/ee/sheltermap/api/ErrorResponse.java` |
| 15 | `src/main/java/ee/sheltermap/sitetexts/SiteTextValidationException.java` |
| 15 | `src/main/java/ee/sheltermap/domain/GuidanceStatus.java` |
| 15 | `src/main/java/ee/sheltermap/auth/InvalidProfilePasswordException.java` |
| 15 | `src/main/java/ee/sheltermap/app/ShelterNotFoundException.java` |
| 15 | `src/main/java/ee/sheltermap/app/NonSuspendableUserException.java` |
| 15 | `src/main/java/ee/sheltermap/api/UpdateSiteTextRequest.java` |
| 15 | `src/main/java/ee/sheltermap/api/LocationResolvedDto.java` |
| 14 | `src/main/java/ee/sheltermap/domain/ReviewDecision.java` |
| 14 | `src/main/java/ee/sheltermap/auth/JwtProperties.java` |
| 14 | `src/main/java/ee/sheltermap/auth/InvalidAccessTokenException.java` |
| 14 | `src/main/java/ee/sheltermap/auth/ConfirmChangeRequest.java` |
| 14 | `src/main/java/ee/sheltermap/app/ImportOwnedShelterException.java` |
| 14 | `src/main/java/ee/sheltermap/app/AdminAccessException.java` |
| 13 | `src/main/java/ee/sheltermap/auth/VerificationFailedException.java` |
| 13 | `src/main/java/ee/sheltermap/auth/RefreshRequest.java` |
| 13 | `src/main/java/ee/sheltermap/auth/PasswordHasher.java` |
| 13 | `src/main/java/ee/sheltermap/auth/InvalidResetTokenException.java` |
| 13 | `src/main/java/ee/sheltermap/auth/InvalidContactChangeException.java` |
| 13 | `src/main/java/ee/sheltermap/auth/ChangeEmailRequest.java` |
| 13 | `src/main/java/ee/sheltermap/app/LocationUpstreamException.java` |
| 13 | `src/main/java/ee/sheltermap/app/LocationResolveException.java` |
| 13 | `src/main/java/ee/sheltermap/api/SiteTextEntryDto.java` |
| 13 | `src/main/java/ee/sheltermap/api/OpenStatusReportRequest.java` |
| 13 | `src/main/java/ee/sheltermap/api/InfoRequestReplyRequest.java` |
| 13 | `src/main/java/ee/sheltermap/api/AdminShelterStatusRequest.java` |
| 13 | `src/main/java/ee/sheltermap/api/AdminMarkInaccurateRequest.java` |
| 13 | `src/main/java/ee/sheltermap/api/AdminInfoRequestRequest.java` |
| 12 | `src/main/java/ee/sheltermap/domain/ShelterSource.java` |
| 12 | `src/main/java/ee/sheltermap/domain/OpenStatusState.java` |
| 12 | `src/main/java/ee/sheltermap/domain/OccupancyBand.java` |
| 12 | `src/main/java/ee/sheltermap/auth/VerifyRequest.java` |
| 12 | `src/main/java/ee/sheltermap/auth/InvalidCredentialsException.java` |
| 12 | `src/main/java/ee/sheltermap/app/UserNotFoundException.java` |
| 12 | `src/main/java/ee/sheltermap/app/InfoRequestAlreadyAnsweredException.java` |
| 12 | `src/main/java/ee/sheltermap/app/DuplicateInfoRequestException.java` |
| 12 | `src/main/java/ee/sheltermap/api/ShelterReportResult.java` |
| 12 | `src/main/java/ee/sheltermap/api/OccupancyReportRequest.java` |
| 11 | `src/main/java/ee/sheltermap/sitetexts/SiteTextEntry.java` |
| 11 | `src/main/java/ee/sheltermap/persistence/UserKind.java` |
| 11 | `src/main/java/ee/sheltermap/domain/VerificationLevel.java` |
| 11 | `src/main/java/ee/sheltermap/domain/ContactChangeType.java` |
| 11 | `src/main/java/ee/sheltermap/auth/ChangePhoneRequest.java` |
| 11 | `src/main/java/ee/sheltermap/app/ReportNotFoundException.java` |
| 11 | `src/main/java/ee/sheltermap/app/InfoRequestNotFoundException.java` |
| 10 | `src/main/java/ee/sheltermap/domain/ShelterStatus.java` |
| 10 | `src/main/java/ee/sheltermap/auth/RefreshTokenRecord.java` |
| 9 | `src/main/java/ee/sheltermap/auth/InvalidRefreshTokenException.java` |
| 8 | `src/main/java/ee/sheltermap/auth/PasswordResetRequest.java` |
| 8 | `src/main/java/ee/sheltermap/app/NotVerifiedException.java` |
| 8 | `src/main/java/ee/sheltermap/api/InvalidShelterException.java` |
| 7 | `src/main/java/ee/sheltermap/persistence/SpringDataUserCredentialsRepository.java` |
| 7 | `src/main/java/ee/sheltermap/persistence/SpringDataRetentionRunRepository.java` |
| 7 | `src/main/java/ee/sheltermap/domain/Capability.java` |

### 1b. Backend test — `src/test/java/**` (184 files, 39,888 lines)

| Lines | Path |
|---:|---|
| 1891 | `src/test/java/ee/sheltermap/config/DocumentationFactsTest.java` |
| 1639 | `src/test/java/ee/sheltermap/guidance/GuidanceServiceTest.java` |
| 1038 | `src/test/java/ee/sheltermap/api/AdminModerationIT.java` |
| 959 | `src/test/java/ee/sheltermap/api/ShelterReportIT.java` |
| 876 | `src/test/java/ee/sheltermap/app/ShelterReportServiceTest.java` |
| 868 | `src/test/java/ee/sheltermap/api/ShelterQueryServiceTest.java` |
| 783 | `src/test/java/ee/sheltermap/api/CommunityReviewIT.java` |
| 673 | `src/test/java/ee/sheltermap/api/AdminModerationServiceTest.java` |
| 664 | `src/test/java/ee/sheltermap/api/ShelterTallyCrossingRaceIT.java` |
| 662 | `src/test/java/ee/sheltermap/api/HeroImageImportIT.java` |
| 605 | `src/test/java/ee/sheltermap/api/GuidanceOrderIT.java` |
| 590 | `src/test/java/ee/sheltermap/auth/AccountControllerIT.java` |
| 587 | `src/test/java/ee/sheltermap/app/ShelterServiceTest.java` |
| 572 | `src/test/java/ee/sheltermap/api/ShelterPagingCostIT.java` |
| 549 | `src/test/java/ee/sheltermap/guidance/MarkdownMigrationDriver.java` |
| 535 | `src/test/java/ee/sheltermap/guidance/HeroImageImportServiceTest.java` |
| 516 | `src/test/java/ee/sheltermap/api/ShelterApiIT.java` |
| 485 | `src/test/java/ee/sheltermap/auth/AuthApiIT.java` |
| 436 | `src/test/java/ee/sheltermap/ingestion/ShelterImportServiceTest.java` |
| 434 | `src/test/java/ee/sheltermap/guidance/MediaServiceTest.java` |
| 430 | `src/test/java/ee/sheltermap/security/GuidanceAuthorizationIT.java` |
| 391 | `src/test/java/ee/sheltermap/api/OpenApiContractIT.java` |
| 388 | `src/test/java/ee/sheltermap/api/GuidanceTranslationIT.java` |
| 384 | `src/test/java/ee/sheltermap/verification/VerificationServiceTest.java` |
| 371 | `src/test/java/ee/sheltermap/guidance/MediaImageInspectorTest.java` |
| 370 | `src/test/java/ee/sheltermap/guidance/MarkdownToHtmlTest.java` |
| 359 | `src/test/java/ee/sheltermap/api/CommunityPulseTest.java` |
| 358 | `src/test/java/ee/sheltermap/auth/ContactChangeServiceTest.java` |
| 354 | `src/test/java/ee/sheltermap/security/PiiAtRestIT.java` |
| 351 | `src/test/java/ee/sheltermap/app/LocationResolveServiceTest.java` |
| 339 | `src/test/java/ee/sheltermap/api/ShelterInfoRequestIT.java` |
| 339 | `src/test/java/ee/sheltermap/api/AdminGuidanceSearchPagingIT.java` |
| 337 | `src/test/java/ee/sheltermap/api/MarkInaccurateIT.java` |
| 333 | `src/test/java/ee/sheltermap/guidance/MediaDerivativesTest.java` |
| 332 | `src/test/java/ee/sheltermap/api/ShelterBboxPagingIT.java` |
| 324 | `src/test/java/ee/sheltermap/auth/AccountDeletionIT.java` |
| 315 | `src/test/java/ee/sheltermap/ingestion/CsvRegistryClientTest.java` |
| 315 | `src/test/java/ee/sheltermap/auth/PasswordResetServiceTest.java` |
| 304 | `src/test/java/ee/sheltermap/api/CommunityPulseIT.java` |
| 298 | `src/test/java/ee/sheltermap/api/ProvenanceApiIT.java` |
| 298 | `src/test/java/ee/sheltermap/api/AdminAlertsIT.java` |
| 286 | `src/test/java/ee/sheltermap/api/UserSuspensionIT.java` |
| 276 | `src/test/java/ee/sheltermap/guidance/GuidanceOrderingServiceTest.java` |
| 253 | `src/test/java/ee/sheltermap/api/ReportThrottleIT.java` |
| 246 | `src/test/java/ee/sheltermap/api/ShelterHistoryIT.java` |
| 239 | `src/test/java/ee/sheltermap/api/GuidancePaginationIT.java` |
| 227 | `src/test/java/ee/sheltermap/security/PasswordRecoveryFlowIT.java` |
| 226 | `src/test/java/ee/sheltermap/sitetexts/SiteTextsServiceTest.java` |
| 223 | `src/test/java/ee/sheltermap/persistence/AbstractPersistenceIT.java` |
| 223 | `src/test/java/ee/sheltermap/guidance/JdkHeroImageFetchClientTest.java` |
| 220 | `src/test/java/ee/sheltermap/app/InMemoryShelterRepository.java` |
| 217 | `src/test/java/ee/sheltermap/auth/AccountServiceTest.java` |
| 217 | `src/test/java/ee/sheltermap/api/LastVerifiedApiIT.java` |
| 216 | `src/test/java/ee/sheltermap/guidance/MediaStorageTest.java` |
| 215 | `src/test/java/ee/sheltermap/auth/VerificationControllerIT.java` |
| 210 | `src/test/java/ee/sheltermap/retention/RetentionServiceTest.java` |
| 207 | `src/test/java/ee/sheltermap/api/GuidanceLocaleFilterIT.java` |
| 203 | `src/test/java/ee/sheltermap/guidance/GuidanceOrderBackfillIT.java` |
| 201 | `src/test/java/ee/sheltermap/api/SiteTextsApiIT.java` |
| 201 | `src/test/java/ee/sheltermap/api/ShelterDuplicateIT.java` |
| 199 | `src/test/java/ee/sheltermap/security/AdminAuthorizationIT.java` |
| 197 | `src/test/java/ee/sheltermap/api/MediaDerivativeServingIT.java` |
| 190 | `src/test/java/ee/sheltermap/retention/RetentionPruningIT.java` |
| 190 | `src/test/java/ee/sheltermap/config/SourceVocabularyTest.java` |
| 188 | `src/test/java/ee/sheltermap/api/AdminMediaClientErrorsIT.java` |
| 184 | `src/test/java/ee/sheltermap/auth/AuthServiceTest.java` |
| 183 | `src/test/java/ee/sheltermap/auth/OtpContactCapIT.java` |
| 182 | `src/test/java/ee/sheltermap/api/ApiErrorHandlerTest.java` |
| 181 | `src/test/java/ee/sheltermap/guidance/BodySanitizerTest.java` |
| 179 | `src/test/java/ee/sheltermap/auth/CurrentCallerTest.java` |
| 178 | `src/test/java/ee/sheltermap/config/JwtAuthenticationFilterTest.java` |
| 178 | `src/test/java/ee/sheltermap/app/ShelterServiceOwnershipTest.java` |
| 172 | `src/test/java/ee/sheltermap/config/FailClosedGuardTest.java` |
| 167 | `src/test/java/ee/sheltermap/verification/FileVerificationSendLogTest.java` |
| 166 | `src/test/java/ee/sheltermap/persistence/PasswordResetTokenRepositoryIT.java` |
| 166 | `src/test/java/ee/sheltermap/auth/AdminSeederIT.java` |
| 162 | `src/test/java/ee/sheltermap/persistence/ShelterSubmissionCapRaceIT.java` |
| 161 | `src/test/java/ee/sheltermap/api/ShelterDailyLimitIT.java` |
| 158 | `src/test/java/ee/sheltermap/guidance/InMemoryGuidanceTranslationRepository.java` |
| 157 | `src/test/java/ee/sheltermap/ingestion/RegistryCsvParserTest.java` |
| 157 | `src/test/java/ee/sheltermap/app/HttpUrlRedirectClientTest.java` |
| 157 | `src/test/java/ee/sheltermap/api/ShelterControllerDetailReadTest.java` |
| 154 | `src/test/java/ee/sheltermap/persistence/UserOptimisticLockingIT.java` |
| 152 | `src/test/java/ee/sheltermap/auth/AdminSeederTest.java` |
| 150 | `src/test/java/ee/sheltermap/guidance/InMemoryGuidancePostRepository.java` |
| 148 | `src/test/java/ee/sheltermap/config/TestConfigOverlayTest.java` |
| 147 | `src/test/java/ee/sheltermap/api/LocationResolveIT.java` |
| 146 | `src/test/java/ee/sheltermap/app/InMemoryUserRepository.java` |
| 145 | `src/test/java/ee/sheltermap/app/InMemoryShelterReportRepository.java` |
| 145 | `src/test/java/ee/sheltermap/api/ErrorDispatchPublicEndpointIT.java` |
| 143 | `src/test/java/ee/sheltermap/security/PiiCryptoTest.java` |
| 141 | `src/test/java/ee/sheltermap/api/ShelterRequestConstraintParityTest.java` |
| 140 | `src/test/java/ee/sheltermap/guidance/GuidanceValidationTest.java` |
| 140 | `src/test/java/ee/sheltermap/auth/AccountDataExportIT.java` |
| 139 | `src/test/java/ee/sheltermap/domain/ProvenanceTest.java` |
| 139 | `src/test/java/ee/sheltermap/config/SecurityHeadersIT.java` |
| 139 | `src/test/java/ee/sheltermap/api/EmailTestControllerIT.java` |
| 138 | `src/test/java/ee/sheltermap/api/ApiErrorHandlerClientErrorsMvcTest.java` |
| 137 | `src/test/java/ee/sheltermap/auth/AuthRequestConstraintParityTest.java` |
| 136 | `src/test/java/ee/sheltermap/verification/PhoneVerificationProviderTest.java` |
| 136 | `src/test/java/ee/sheltermap/retention/RetentionBackfillIT.java` |
| 136 | `src/test/java/ee/sheltermap/persistence/ShelterOptimisticLockingIT.java` |
| 134 | `src/test/java/ee/sheltermap/persistence/ShelterRepositoryIT.java` |
| 132 | `src/test/java/ee/sheltermap/app/InMemoryModerationAuditLog.java` |
| 131 | `src/test/java/ee/sheltermap/api/ShelterApiE2EIT.java` |
| 127 | `src/test/java/ee/sheltermap/VerificationFlowTest.java` |
| 125 | `src/test/java/ee/sheltermap/verification/EmailVerificationProviderTest.java` |
| 122 | `src/test/java/ee/sheltermap/auth/VerificationDailyCapIT.java` |
| 122 | `src/test/java/ee/sheltermap/auth/RefreshRotationRaceIT.java` |
| 120 | `src/test/java/ee/sheltermap/api/OpenApiSnapshotIT.java` |
| 116 | `src/test/java/ee/sheltermap/auth/JwtTokenServiceTest.java` |
| 116 | `src/test/java/ee/sheltermap/alerts/ThrottleAlertRecorderTest.java` |
| 115 | `src/test/java/ee/sheltermap/auth/ClientIpsTest.java` |
| 114 | `src/test/java/ee/sheltermap/auth/VerificationThrottleIT.java` |
| 114 | `src/test/java/ee/sheltermap/api/EmailTestControllerAllowlistIT.java` |
| 113 | `src/test/java/ee/sheltermap/api/SmsTestControllerTest.java` |
| 109 | `src/test/java/ee/sheltermap/ingestion/RegistryShelterParserTest.java` |
| 108 | `src/test/java/ee/sheltermap/verification/PendingVerificationDuplicateIT.java` |
| 108 | `src/test/java/ee/sheltermap/auth/AuthRateLimitIT.java` |
| 108 | `src/test/java/ee/sheltermap/app/MapsUrlCoordinatesTest.java` |
| 107 | `src/test/java/ee/sheltermap/guidance/HeroAddressPolicyTest.java` |
| 106 | `src/test/java/ee/sheltermap/domain/UserHierarchyTest.java` |
| 104 | `src/test/java/ee/sheltermap/api/SmsTestControllerIT.java` |
| 103 | `src/test/java/ee/sheltermap/auth/InMemoryPasswordResetTokenRepository.java` |
| 102 | `src/test/java/ee/sheltermap/guidance/InMemoryMediaAssetRepository.java` |
| 102 | `src/test/java/ee/sheltermap/config/ApiDocsGuardTest.java` |
| 100 | `src/test/java/ee/sheltermap/config/DevEndpointsGuardTest.java` |
| 99 | `src/test/java/ee/sheltermap/config/ApiDocsProdClosureIT.java` |
| 97 | `src/test/java/ee/sheltermap/auth/SessionLifecycleThrottleIT.java` |
| 93 | `src/test/java/ee/sheltermap/verification/RollingContactOtpLimiterTest.java` |
| 93 | `src/test/java/ee/sheltermap/config/ProdJwtGuardTest.java` |
| 93 | `src/test/java/ee/sheltermap/auth/TokenBucketRateLimiterTest.java` |
| 92 | `src/test/java/ee/sheltermap/config/DataSourceCredentialGuardTest.java` |
| 92 | `src/test/java/ee/sheltermap/api/SmsTestControllerAllowlistIT.java` |
| 90 | `src/test/java/ee/sheltermap/verification/TwilioSmsSenderTest.java` |
| 86 | `src/test/java/ee/sheltermap/config/RegistrySchedulerTest.java` |
| 83 | `src/test/java/ee/sheltermap/ingestion/RegistryImportIT.java` |
| 83 | `src/test/java/ee/sheltermap/api/DataSourceApiIT.java` |
| 82 | `src/test/java/ee/sheltermap/persistence/UserRepositoryIT.java` |
| 82 | `src/test/java/ee/sheltermap/config/DevSenderGuardTest.java` |
| 81 | `src/test/java/ee/sheltermap/app/InMemoryShelterInfoRequestLog.java` |
| 78 | `src/test/java/ee/sheltermap/config/CorsExposedHeadersIT.java` |
| 76 | `src/test/java/ee/sheltermap/persistence/RefreshTokenRepositoryIT.java` |
| 75 | `src/test/java/ee/sheltermap/config/LoopbackXffTrustGuardTest.java` |
| 72 | `src/test/java/ee/sheltermap/persistence/PendingVerificationRepositoryIT.java` |
| 72 | `src/test/java/ee/sheltermap/ingestion/RegistryPropertiesTest.java` |
| 69 | `src/test/java/ee/sheltermap/guidance/GuidanceSearchTest.java` |
| 66 | `src/test/java/ee/sheltermap/ingestion/Lest97AxisOrderTest.java` |
| 66 | `src/test/java/ee/sheltermap/app/InMemoryShelterOpenStatusRepository.java` |
| 64 | `src/test/java/ee/sheltermap/persistence/UserMapperBlankValueTest.java` |
| 63 | `src/test/java/ee/sheltermap/ingestion/FakeRegistryClient.java` |
| 60 | `src/test/java/ee/sheltermap/verification/InMemoryVerificationSendLog.java` |
| 59 | `src/test/java/ee/sheltermap/api/JsonOnlyContentNegotiationIT.java` |
| 57 | `src/test/java/ee/sheltermap/app/InMemoryDataImportLog.java` |
| 56 | `src/test/java/ee/sheltermap/app/InMemoryShelterOccupancyRepository.java` |
| 56 | `src/test/java/ee/sheltermap/app/InMemoryReportActionLog.java` |
| 55 | `src/test/java/ee/sheltermap/persistence/UserCredentialsRepositoryIT.java` |
| 55 | `src/test/java/ee/sheltermap/auth/StubTokenService.java` |
| 54 | `src/test/java/ee/sheltermap/auth/InMemoryPendingContactChangeRepository.java` |
| 53 | `src/test/java/ee/sheltermap/verification/SmtpPulseSmtpSenderTest.java` |
| 53 | `src/test/java/ee/sheltermap/verification/PhoneNumbersTest.java` |
| 52 | `src/test/java/ee/sheltermap/security/ContactsTest.java` |
| 52 | `src/test/java/ee/sheltermap/domain/ReporterTrustTest.java` |
| 52 | `src/test/java/ee/sheltermap/auth/InMemoryRefreshTokenRepository.java` |
| 49 | `src/test/java/ee/sheltermap/auth/Argon2PasswordHasherTest.java` |
| 48 | `src/test/java/ee/sheltermap/auth/RecordingSmtpSender.java` |
| 48 | `src/test/java/ee/sheltermap/auth/RecordingSmsSender.java` |
| 48 | `src/test/java/ee/sheltermap/app/InMemoryShelterHistoryLog.java` |
| 46 | `src/test/java/ee/sheltermap/api/SubmitterVerificationTest.java` |
| 45 | `src/test/java/ee/sheltermap/domain/VerificationPolicyTest.java` |
| 43 | `src/test/java/ee/sheltermap/verification/InMemoryPendingVerificationRepository.java` |
| 40 | `src/test/java/ee/sheltermap/auth/InMemoryUserCredentialsRepository.java` |
| 39 | `src/test/java/ee/sheltermap/testutil/TestPiiCrypto.java` |
| 36 | `src/test/java/ee/sheltermap/auth/MutableClock.java` |
| 35 | `src/test/java/ee/sheltermap/ingestion/LEst97TransformerTest.java` |
| 32 | `src/test/java/ee/sheltermap/verification/CapturingSmtpSender.java` |
| 32 | `src/test/java/ee/sheltermap/verification/CapturingSmsSender.java` |
| 31 | `src/test/java/ee/sheltermap/app/UserServiceTest.java` |
| 28 | `src/test/java/ee/sheltermap/retention/RetentionSchedulerIT.java` |
| 28 | `src/test/java/ee/sheltermap/auth/StubPasswordHasher.java` |
| 27 | `src/test/java/ee/sheltermap/retention/RetentionDisabledByDefaultIT.java` |
| 20 | `src/test/java/ee/sheltermap/testutil/FakeJavaMailSender.java` |
| 20 | `src/test/java/ee/sheltermap/retention/InMemoryRetentionRunLog.java` |
| 13 | `src/test/java/ee/sheltermap/auth/TestTokens.java` |

### 1c. Frontend — `frontend/src/app/**` (217 files, 63,999 lines; .ts + .scss + .html)

| Lines | Path |
|---:|---|
| 4097 | `frontend/src/app/features/admin/admin-page.spec.ts` |
| 2240 | `frontend/src/app/features/shelter/shelter-detail-page.spec.ts` |
| 2174 | `frontend/src/app/features/map/map-page.spec.ts` |
| 2126 | `frontend/src/app/features/admin/admin-page.ts` |
| 2094 | `frontend/src/app/design-tokens.spec.ts` |
| 2032 | `frontend/src/app/features/admin/guidance-editor.spec.ts` |
| 1530 | `frontend/src/app/core/i18n/messages.ts` |
| 1510 | `frontend/src/app/features/shelter/submit-shelter-page.spec.ts` |
| 1429 | `frontend/src/app/features/admin/guidance-editor.ts` |
| 1318 | `frontend/src/app/core/i18n/ru.ts` |
| 1255 | `frontend/src/app/core/i18n/en.ts` |
| 1254 | `frontend/src/app/core/i18n/et.ts` |
| 1222 | `frontend/src/app/core/models.ts` |
| 1055 | `frontend/src/app/features/account/account-page.spec.ts` |
| 1024 | `frontend/src/app/shared/page-shell.spec.ts` |
| 950 | `frontend/src/app/features/map/map-page.ts` |
| 920 | `frontend/src/styles.scss` |
| 843 | `frontend/src/app/features/shelter/shelter-detail-page.ts` |
| 814 | `frontend/src/app/gateways/admin-gateway.spec.ts` |
| 774 | `frontend/src/app/features/guidance/guidance-detail-page.spec.ts` |
| 769 | `frontend/src/app/features/shelter/submit-shelter-page.ts` |
| 753 | `frontend/src/app/features/guidance/guidance-list-page.spec.ts` |
| 736 | `frontend/src/app/shared/leaflet-service.spec.ts` |
| 704 | `frontend/src/app/features/map/map-page.scss` |
| 669 | `frontend/src/app/session/auth-store.spec.ts` |
| 651 | `frontend/src/app/hero-geometry.spec.ts` |
| 622 | `frontend/src/app/gateways/admin-gateway.ts` |
| 612 | `frontend/src/app/features/admin/shelters-view.ts` |
| 585 | `frontend/src/app/shared/shelter-copy.spec.ts` |
| 558 | `frontend/src/app/features/shelter/shelter-detail-page.html` |
| 537 | `frontend/src/app/shared/shelter-copy.ts` |
| 517 | `frontend/src/app/features/account/account-page.ts` |
| 486 | `frontend/src/app/features/shelter/shelter-detail-page.scss` |
| 479 | `frontend/src/app/features/auth/reset-page.spec.ts` |
| 464 | `frontend/src/app/features/account/contributions-panel.spec.ts` |
| 450 | `frontend/src/app/shared/page-shell.scss` |
| 441 | `frontend/src/app/features/map/map-page.html` |
| 441 | `frontend/src/app/features/account/account-page.html` |
| 435 | `frontend/src/app/features/admin/shelters-panel.html` |
| 408 | `frontend/src/app/shared/location-input.ts` |
| 405 | `frontend/src/app/shared/location-input.spec.ts` |
| 389 | `frontend/src/app/gateways/shelter-gateway.spec.ts` |
| 373 | `frontend/src/app/session/auth-store.ts` |
| 373 | `frontend/src/app/features/account/verify-page.spec.ts` |
| 371 | `frontend/src/app/shared/leaflet-service.ts` |
| 370 | `frontend/src/app/features/admin/_admin-shared.scss` |
| 368 | `frontend/src/app/features/auth/register-page.spec.ts` |
| 360 | `frontend/src/app/features/auth/login-page.spec.ts` |
| 360 | `frontend/src/app/features/admin/guidance-editor.html` |
| 351 | `frontend/src/app/features/shelter/submit-shelter-page-session.spec.ts` |
| 351 | `frontend/src/app/core/i18n/i18n.service.ts` |
| 350 | `frontend/src/app/core/i18n/i18n.spec.ts` |
| 337 | `frontend/src/app/features/admin/guidance-order-list.spec.ts` |
| 319 | `frontend/src/app/features/admin/admin-page.html` |
| 319 | `frontend/src/app/features/account/contributions-panel.ts` |
| 314 | `frontend/src/app/features/admin/guidance-editor.scss` |
| 301 | `frontend/src/app/features/account/verify-page.ts` |
| 296 | `frontend/src/app/features/shelter/submit-shelter-page.scss` |
| 293 | `frontend/src/app/core/prepaint.spec.ts` |
| 293 | `frontend/src/app/core/i18n/i18n-template-guard.spec.ts` |
| 291 | `frontend/src/app/shared/accessibility-dialog.component.scss` |
| 266 | `frontend/src/app/shared/error-copy.spec.ts` |
| 265 | `frontend/src/app/shared/accessibility-dialog.component.spec.ts` |
| 256 | `frontend/src/app/features/legal/privacy-policy-page.html` |
| 254 | `frontend/src/app/features/shelter/submit-shelter-page.html` |
| 253 | `frontend/src/app/features/guidance/guidance-list-page.ts` |
| 253 | `frontend/src/app/features/admin/shelters-panel.ts` |
| 253 | `frontend/src/app/core/i18n/i18n-template-guard-scanner.ts` |
| 249 | `frontend/src/app/core/api-interceptor.spec.ts` |
| 247 | `frontend/src/app/core/theme-store.spec.ts` |
| 242 | `frontend/src/app/core/guards.spec.ts` |
| 238 | `frontend/src/app/features/admin/site-texts-panel.ts` |
| 233 | `frontend/src/app/features/admin/guidance-order-list.html` |
| 218 | `frontend/src/app/features/admin/guidance-panel.ts` |
| 210 | `frontend/src/app/features/admin/guidance-order-list.ts` |
| 209 | `frontend/src/app/shared/error-copy.ts` |
| 209 | `frontend/src/app/core/models-contract.spec.ts` |
| 207 | `frontend/src/app/features/account/contributions-panel.scss` |
| 205 | `frontend/src/app/gateways/guidance-gateway.spec.ts` |
| 199 | `frontend/src/app/features/account/contributions-panel.html` |
| 197 | `frontend/src/app/core/theme-tokens.ts` |
| 187 | `frontend/src/app/features/admin/site-texts-panel.spec.ts` |
| 186 | `frontend/src/app/features/guidance/guidance-detail-page.ts` |
| 184 | `frontend/src/app/features/auth/reset-page.ts` |
| 182 | `frontend/src/app/shared/page-shell.html` |
| 178 | `frontend/src/app/features/admin/guidance-panel.html` |
| 176 | `frontend/src/app/shared/page-shell.ts` |
| 173 | `frontend/src/app/gateways/geocode-gateway.spec.ts` |
| 172 | `frontend/src/app/core/api-error.ts` |
| 169 | `frontend/src/app/architecture.spec.ts` |
| 167 | `frontend/src/app/shared/accessibility-dialog.component.ts` |
| 164 | `frontend/src/app/features/auth/reset-page.html` |
| 158 | `frontend/src/app/features/admin/media-panel.html` |
| 157 | `frontend/src/app/core/api-client.spec.ts` |
| 154 | `frontend/src/app/features/legal/terms-page.html` |
| 154 | `frontend/src/app/features/account/account-page.scss` |
| 153 | `frontend/src/app/gateways/shelter-gateway.ts` |
| 151 | `frontend/src/app/features/admin/users-panel.html` |
| 150 | `frontend/src/app/core/api-error.spec.ts` |
| 146 | `frontend/src/app/app.routes.ts` |
| 142 | `frontend/src/app/features/auth/register-page.html` |
| 133 | `frontend/src/app/shared/report-gauge.spec.ts` |
| 132 | `frontend/src/app/features/guidance/guidance-detail-page.scss` |
| 129 | `frontend/src/app/core/i18n/site-texts.ts` |
| 127 | `frontend/src/app/features/legal/privacy-policy-page.spec.ts` |
| 127 | `frontend/src/app/features/admin/site-texts-panel.scss` |
| 124 | `frontend/src/app/shared/resend-countdown.spec.ts` |
| 123 | `frontend/src/index.html` |
| 123 | `frontend/src/app/shared/paging.spec.ts` |
| 121 | `frontend/src/app/gateways/api-contract.spec.ts` |
| 121 | `frontend/src/app/features/admin/reports-panel.html` |
| 120 | `frontend/src/app/features/admin/reports-panel.ts` |
| 120 | `frontend/src/app/features/admin/media-panel.ts` |
| 119 | `frontend/src/app/shared/consent-banner.component.spec.ts` |
| 119 | `frontend/src/app/core/i18n/catalog-identity.spec.ts` |
| 118 | `frontend/src/app/gateways/account-gateway.spec.ts` |
| 115 | `frontend/src/app/features/account/verify-page.html` |
| 115 | `frontend/src/app/core/title.spec.ts` |
| 113 | `frontend/src/app/shared/pagination.spec.ts` |
| 112 | `frontend/src/app/features/guidance/guidance-list-page.html` |
| 112 | `frontend/src/app/features/admin/unconfirmed-panel.html` |
| 112 | `frontend/src/app/core/theme-store.ts` |
| 110 | `frontend/src/app/gateways/geocode-gateway.ts` |
| 110 | `frontend/src/app/gateways/geo-gateway.spec.ts` |
| 110 | `frontend/src/app/features/admin/guidance-translations.ts` |
| 107 | `frontend/src/app/core/guards.ts` |
| 105 | `frontend/src/app/core/api-interceptor.ts` |
| 103 | `frontend/src/app/features/legal/terms-page.spec.ts` |
| 101 | `frontend/src/app/gateways/auth-gateway.spec.ts` |
| 101 | `frontend/src/app/app.spec.ts` |
| 100 | `frontend/src/app/shared/confirm-action.spec.ts` |
| 99 | `frontend/src/app/features/guidance/guidance-list-page.scss` |
| 99 | `frontend/src/app/features/auth/register-page.ts` |
| 94 | `frontend/src/app/shared/geolocation.ts` |
| 93 | `frontend/src/app/shared/report-gauge.scss` |
| 91 | `frontend/src/app/features/admin/users-panel.ts` |
| 89 | `frontend/src/app/gateways/guidance-gateway.ts` |
| 89 | `frontend/src/app/features/guidance/guidance-detail-page.html` |
| 89 | `frontend/src/app/features/admin/guidance-translations.html` |
| 87 | `frontend/src/app/shared/form-helpers.spec.ts` |
| 86 | `frontend/src/app/shared/resend-countdown.ts` |
| 86 | `frontend/src/app/core/prepaint.ts` |
| 84 | `frontend/src/app/features/admin/audit-panel.ts` |
| 83 | `frontend/src/app/gateways/account-gateway.ts` |
| 82 | `frontend/src/app/features/account/verify-page.scss` |
| 81 | `frontend/src/app/shared/report-gauge.ts` |
| 79 | `frontend/src/app/shared/paging.ts` |
| 79 | `frontend/src/app/core/consent-store.ts` |
| 78 | `frontend/src/app/shared/confirm-action.ts` |
| 76 | `frontend/src/test-setup.ts` |
| 76 | `frontend/src/app/shared/list-state.spec.ts` |
| 76 | `frontend/src/app/shared/admin-copy.ts` |
| 74 | `frontend/src/app/shared/consent-banner.component.ts` |
| 74 | `frontend/src/app/features/admin/site-texts-panel.html` |
| 73 | `frontend/src/app/features/auth/login-page.html` |
| 73 | `frontend/src/app/features/admin/audit-panel.html` |
| 72 | `frontend/src/app/features/auth/login-page.ts` |
| 71 | `frontend/src/app/features/admin/unconfirmed-panel.ts` |
| 70 | `frontend/src/app/gateways/verify-gateway.spec.ts` |
| 69 | `frontend/src/app/shared/pagination.ts` |
| 69 | `frontend/src/app/shared/consent-banner.component.scss` |
| 68 | `frontend/src/app/gateways/auth-gateway.ts` |
| 67 | `frontend/src/app/features/admin/media-panel.spec.ts` |
| 65 | `frontend/src/app/features/admin/guidance-order-list.scss` |
| 65 | `frontend/src/app/core/api-client.ts` |
| 64 | `frontend/src/app/gateways/site-texts-gateway.spec.ts` |
| 60 | `frontend/src/app/features/admin/alerts-panel.ts` |
| 59 | `frontend/src/app/shared/report-gauge.html` |
| 59 | `frontend/src/app/core/consent-store.spec.ts` |
| 57 | `frontend/src/app/core/token-store.ts` |
| 56 | `frontend/src/app/features/admin/guidance-translations.scss` |
| 54 | `frontend/src/app/shared/admin-tab.ts` |
| 54 | `frontend/src/app/shared/accessibility-dialog.component.html` |
| 54 | `frontend/src/app/gateways/data-source-gateway.spec.ts` |
| 54 | `frontend/src/app/features/legal/terms-page.scss` |
| 54 | `frontend/src/app/core/title.ts` |
| 53 | `frontend/src/app/features/legal/privacy-policy-page.scss` |
| 53 | `frontend/src/app/features/admin/guidance-panel.scss` |
| 52 | `frontend/src/app/shared/banner.component.spec.ts` |
| 49 | `frontend/src/app/shared/list-state.ts` |
| 48 | `frontend/src/app/core/token-store.spec.ts` |
| 44 | `frontend/src/app/features/legal/privacy-policy-page.ts` |
| 43 | `frontend/src/app/features/legal/terms-page.ts` |
| 40 | `frontend/src/app/shared/pagination.html` |
| 40 | `frontend/src/app/shared/form-helpers.ts` |
| 39 | `frontend/src/app/features/admin/admin-page.scss` |
| 38 | `frontend/src/app/features/admin/media-panel.scss` |
| 38 | `frontend/src/app/features/admin/alerts-panel.html` |
| 35 | `frontend/src/app/gateways/verify-gateway.ts` |
| 34 | `frontend/src/app/shared/pagination.scss` |
| 33 | `frontend/src/app/gateways/site-texts-gateway.ts` |
| 32 | `frontend/src/app/shared/banner.component.scss` |
| 32 | `frontend/src/app/features/admin/shelters-panel.scss` |
| 31 | `frontend/src/app/gateways/geo-gateway.ts` |
| 30 | `frontend/src/app/shared/gauge-math.ts` |
| 30 | `frontend/src/app/shared/gauge-math.spec.ts` |
| 29 | `frontend/src/app/shared/list-state.scss` |
| 29 | `frontend/src/app/core/i18n/translate-pipe.ts` |
| 27 | `frontend/src/app/app.ts` |
| 26 | `frontend/src/environments/environment.ts` |
| 26 | `frontend/src/app/shared/loading-indicator.spec.ts` |
| 26 | `frontend/src/app/features/auth/login-page.scss` |
| 26 | `frontend/src/app/core/i18n/locale.ts` |
| 23 | `frontend/src/app/shared/consent-banner.component.html` |
| 22 | `frontend/src/app/gateways/data-source-gateway.ts` |
| 22 | `frontend/src/app/features/auth/reset-page.scss` |
| 22 | `frontend/src/app/features/auth/register-page.scss` |
| 20 | `frontend/src/app/shared/loading-indicator.ts` |
| 20 | `frontend/src/app/shared/banner.component.ts` |
| 17 | `frontend/src/app/shared/list-state.html` |
| 15 | `frontend/src/main.ts` |
| 14 | `frontend/src/node-fs.d.ts` |
| 13 | `frontend/src/app/app.config.ts` |
| 11 | `frontend/src/app/shared/loading-indicator.scss` |
| 8 | `frontend/src/app/shared/banner.component.html` |
| 8 | `frontend/src/app/app.html` |
| 7 | `frontend/src/app/features/admin/reports-panel.scss` |
| 6 | `frontend/src/app/features/admin/users-panel.scss` |
| 6 | `frontend/src/app/features/admin/audit-panel.scss` |
| 5 | `frontend/src/app/features/admin/unconfirmed-panel.scss` |
| 5 | `frontend/src/app/features/admin/alerts-panel.scss` |
| 4 | `frontend/src/app/app.scss` |
| 1 | `frontend/src/environments/environment.development.ts` |
| 1 | `frontend/src/app/shared/loading-indicator.html` |

Frontend files outside `frontend/src/app/` (covered by the `FE-APP-ROOT` lane):
`frontend/src/styles.scss` 920 (owned by `FE-STYLES`), `frontend/src/index.html` 123,
`frontend/src/test-setup.ts` 76, `frontend/src/main.ts` 15, `frontend/src/node-fs.d.ts` 14,
`frontend/src/environments/*.ts` 27.

---

## 2. Proposed lane split

Rules applied: one lane per directory **or** per file; every file over ~400 lines gets its own
lane (with its dedicated test files); a lane owns its files exclusively; tests travel with the
main file they pin; shared areas are one-lane-at-a-time. **49 lanes total**
(27 backend, 22 frontend). Every file in scope is owned by exactly one lane
(asserted by the generator).

### Backend lanes (27)

| # | Lane | Owns (files) | Files | Lines | Big-file lane |
|---:|---|---|---:|---:|---|
| 1 | `BE-GUIDANCE-SERVICE` | GuidanceService god class + its validation/slug/sanitizer/search helpers + dedicated tests | 16 | 4029 | **yes** |
| 2 | `BE-GUIDANCE-HERO` | Hero image import pipeline + fetch client + address policy | 12 | 2487 | **yes** |
| 3 | `BE-GUIDANCE-MEDIA` | Media upload/derivative pipeline (inspector, derivatives, storage, service) | 15 | 3276 | **yes** |
| 4 | `BE-GUIDANCE-MARKDOWN` | Markdown converter + migration driver + tests | 3 | 1330 | **yes** |
| 5 | `BE-GUIDANCE-ORDERING` | Guidance ordering service + reorder tests/ITs | 4 | 1345 |  |
| 6 | `BE-ADMIN-GUIDANCE-CTRL` | Admin guidance REST controller + its guidance DTOs + endpoint ITs | 14 | 2219 | **yes** |
| 7 | `BE-ADMIN-MODERATION` | Admin moderation service (9 admin actions) + its tests and moderation-flow ITs | 7 | 4119 | **yes** |
| 8 | `BE-SHELTER-QUERY` | Public shelter query service + query/paging/provenance/pulse tests | 8 | 3837 | **yes** |
| 9 | `BE-SHELTER-CTRL` | Public shelter controller + submit/report request DTOs + shelter API ITs | 15 | 2013 | **yes** |
| 10 | `BE-ERROR-HANDLER` | Central exception→HTTP mapping + error response types + dispatch tests | 8 | 1080 | **yes** |
| 11 | `BE-ADMIN-CTRL` | Admin shelter controller + admin shelter DTOs + alerts IT | 13 | 1227 | **yes** |
| 12 | `BE-API-REST` | Remaining api/ surface: media/sitetexts/datasource/location controllers, remaining DTOs + their tests | 29 | 2617 |  |
| 13 | `BE-APP-SHELTER` | Shelter CRUD/ownership service + its exceptions + tests | 9 | 1374 | **yes** |
| 14 | `BE-APP-REPORTS` | Report/occupancy/open-status/info-request services + report log types + InMemory fakes for report interfaces | 27 | 4453 | **yes** |
| 15 | `BE-APP-REST` | Location resolve service, audit/history logs, user service, repository interfaces + InMemory fakes + api/LocationController | 29 | 2843 |  |
| 16 | `BE-AUTH-IDENTITY` | Registration/login/JWT/refresh/rate-limiting/seeding + identity tests | 51 | 3780 |  |
| 17 | `BE-AUTH-ACCOUNTS` | Account/profile/contact-change/password-reset/verification endpoints + services + account tests | 38 | 4717 |  |
| 18 | `BE-CONFIG` | Spring config: SecurityConfig (rate-limiter beans), OpenAPI config, schedulers, filters + config tests | 24 | 2706 |  |
| 19 | `BE-GUARDS` | Guard tests only (verified mechanisms — simplify expression, never weaken a pin) | 9 | 2797 | **yes** |
| 20 | `BE-DOMAIN` | Domain model (34 files) + domain tests | 38 | 2610 |  |
| 21 | `BE-INGESTION` | Registry CSV ingestion + tests | 23 | 2569 |  |
| 22 | `BE-VERIFICATION` | Verification (email/phone/Smart-ID) + tests | 38 | 3168 |  |
| 23 | `BE-PERSISTENCE-SHELTER` | Shelter/report/occupancy/history/info-request persistence (entities + Jpa + SpringData) | 24 | 2214 |  |
| 24 | `BE-PERSISTENCE-USER` | User/credentials/token/pending-state persistence (entities + Jpa + SpringData) | 22 | 1772 |  |
| 25 | `BE-PERSISTENCE-GUIDANCE` | Guidance/media/audit/sitetext/retention persistence (entities + mappers + Jpa + SpringData) | 22 | 1771 |  |
| 26 | `BE-SMALL-PKG` | alerts + retention + security + sitetexts packages + application root + their tests | 29 | 3366 |  |
| 27 | `BE-PERSISTENCE-TESTS` | SHARED: persistence integration-test base classes + shared test fakes (serialized) | 13 | 1383 | **SHARED** |

Notes on backend pairing choices:
- `api/LocationController` + `api/LocationResolveIT` sit with `BE-APP-REST` (they exercise `app/LocationResolveService`).
- `InMemory*` test fakes travel with the lane that owns the **interface** they implement, so an
  interface change and its fake land in one lane.
- Guidance DTOs in `api/` travel with `BE-ADMIN-GUIDANCE-CTRL` (their only consumer).

### Frontend lanes (22)

| # | Lane | Owns (files) | Files | Lines | Big-file lane |
|---:|---|---|---:|---:|---|
| 1 | `FE-SHARED-PAGE` | SHARED: page-shell, pagination/paging, banners, list-state, form-helpers | 29 | 3097 | **SHARED** |
| 2 | `FE-SHARED-CONTROLS` | SHARED: leaflet/location-input, copy files, gauges, dialogs, countdown, confirm | 24 | 5278 | **SHARED** |
| 3 | `FE-MODELS` | SHARED: core/models.ts + its contract spec (every feature imports it) | 2 | 1431 | **SHARED** |
| 4 | `FE-I18N-CATALOGS` | SHARED: the four i18n catalogs + site texts + catalog-identity spec | 6 | 5605 | **SHARED** |
| 5 | `FE-I18N-RUNTIME` | i18n service, template guard + scanner, translate pipe, locale | 6 | 1302 |  |
| 6 | `FE-CORE-REST` | core/ theme stores, api client/interceptor/error, consent/guards/title/prepaint + specs | 19 | 2594 |  |
| 7 | `FE-APP-ROOT` | app shell (routes/config/component) + app guard specs + src bootstrap files | 15 | 3468 | **yes** |
| 8 | `FE-GATEWAYS` | All HTTP gateways + api-contract spec | 21 | 3465 |  |
| 9 | `FE-SESSION` | auth-store + spec | 2 | 1042 |  |
| 10 | `FE-AUTH` | features/auth (login/register/reset) + specs | 12 | 2011 |  |
| 11 | `FE-LEGAL` | features/legal (privacy/terms) + specs | 8 | 834 |  |
| 12 | `FE-GUIDANCE-PAGES` | features/guidance (list+detail pages) + specs | 8 | 2398 |  |
| 13 | `FE-MAP` | map page component + spec + template + styles | 4 | 4269 | **yes** |
| 14 | `FE-SHELTER-DETAIL` | shelter detail page (ts/spec/html/scss) | 4 | 4127 | **yes** |
| 15 | `FE-SUBMIT-SHELTER` | submit shelter page (ts/spec/session-spec/html/scss) | 5 | 3180 | **yes** |
| 16 | `FE-ACCOUNT` | features/account (account page, contributions, verify) + specs | 12 | 4227 | **yes** |
| 17 | `FE-ADMIN-PAGE` | admin shell page (ts/html/scss + the 4097-line spec) | 4 | 6581 | **yes** |
| 18 | `FE-ADMIN-GUIDANCE-EDITOR` | guidance editor component + its 2032-line spec + template + styles | 4 | 4135 | **yes** |
| 19 | `FE-ADMIN-GUIDANCE-PANELS` | guidance panel + guidance order list + translations panel (ts/html/scss/specs) | 10 | 1549 |  |
| 20 | `FE-ADMIN-SHELTERS` | shelters view + shelters panel + admin shared styles | 5 | 1702 | **yes** |
| 21 | `FE-ADMIN-PANELS-REST` | site-texts/media/reports/users/audit/alerts/unconfirmed panels + their templates/specs | 23 | 1959 |  |
| 22 | `FE-STYLES` | SHARED: global stylesheet (token home, pinned by the design-tokens audit) | 1 | 920 | **SHARED** |

---

## 3. Shared files — serialize across batches, never parallelise

| Shared file(s) | Lines | Why it is shared |
|---|---:|---|
| `frontend/src/styles.scss` | 920 | Global stylesheet; token home; the `design-tokens.spec.ts` audit pins its `:root` + high-contrast blocks. Owned by `FE-STYLES`. |
| `frontend/src/app/shared/**` (53 files) | 8,375 | Shared component library used by every feature; RUN.md names `shared/paging.ts` explicitly. Split into `FE-SHARED-PAGE` + `FE-SHARED-CONTROLS`, but **at most one of them runs per batch**. |
| `frontend/src/app/core/models.ts` (+ `models-contract.spec.ts`) | 1,431 | ~60 DTO interfaces imported by every feature and every gateway. Owned by `FE-MODELS`. |
| `frontend/src/app/core/i18n/{en,et,ru,messages}.ts` (+ `site-texts.ts`) | 5,486 | The catalogs; `i18n-template-guard` pins every template key against them. Owned by `FE-I18N-CATALOGS`. |
| `src/test/java/ee/sheltermap/persistence/**` (11 files) | 1,324 | Persistence IT base classes — RUN.md forbids any other lane from touching them. Owned by `BE-PERSISTENCE-TESTS`; keep base-class signatures stable or the persistence main lanes' gates break. |
| `src/test/java/ee/sheltermap/testutil/**` | 59 | Shared fakes (`FakeJavaMailSender`, `TestPiiCrypto`), same lane as above. |
| `pom.xml` | 413 | Dependencies, PMD, 0.93 coverage floor. **No lane owns it** — any change is a NOTES-file request, applied serially. |
| `.github/workflows/ci.yml` | — | The gate workflow. Same treatment as `pom.xml`: no owner, serialize via NOTES. |
| Guard tests (backend: `config/*GuardTest*`, `DocumentationFactsTest`; frontend: `design-tokens.spec.ts`, `architecture.spec.ts`, `hero-geometry.spec.ts`) | 5,711 | Verified mechanisms with count floors. Owned by `BE-GUARDS` / `FE-APP-ROOT` respectively — no other lane edits a guard, ever (weakening a pin is out of scope). |

Feature lanes that need a shared-file change (a new model field, a catalog key, a token)
write a one-line request to `docs/autopilot/CODE-REVIEW-NOTES.md` instead of editing.

---

## 4. Highest-value readability targets (top ten)

Evidence: nesting measured as max code indentation, history-tone = comments matching
wave/refactor/previously/kept-for/etc. (pattern scan), "big methods" via brace spans
(over-counts from lambdas noted where relevant). BE-RECON will go deeper; this is the map.

1. **`src/main/java/ee/sheltermap/guidance/GuidanceService.java` (1,063)** — the god class:
   25 `@Transactional` methods in one bean, 17 history-tone comments, and planning ids in javadoc
   (line 695 "D3", line 698 "(W3-A)") that the standard explicitly forbids.
2. **`frontend/src/app/features/admin/admin-page.ts` (2,126) + `admin-page.spec.ts` (4,097)** —
   the largest frontend unit; the admin shell (tabs, data loading, every panel's state) in one
   component; RUN.md names it the first candidate.
3. **`src/main/java/ee/sheltermap/api/ShelterQueryService.java` (887)** — deepest public-query
   logic: nested `ProvenanceFilter` type, `batchesFor`/`callerBands`/`callerOpenStatuses`
   multi-stage pipeline, 30-level nesting.
4. **`src/main/java/ee/sheltermap/api/AdminModerationService.java` (756)** — deepest nesting in
   the repo (35 levels); nine admin actions (setShelterStatus, deleteShelter, requestInfo,
   markInaccurate, …) each 200–350 lines, all in one service.
5. **`frontend/src/app/core/models.ts` (1,222)** — ~60 DTO interfaces in one shared file that
   every feature imports; 8 history-tone comments; the single most-coupled file in the frontend.
6. **`src/main/java/ee/sheltermap/config/SecurityConfig.java` (329)** — ten nearly identical
   `@Bean RateLimiter` one-liners (lines 74–175) each wiring one property pair — a
   table-driven setup would collapse ~100 lines without touching the verified limits.
7. **`src/main/java/ee/sheltermap/api/AdminGuidanceController.java` (753)** — 100–500-line
   endpoint methods (`create`, `requireSearch`, `publish`); controller-level orchestration
   that belongs in the guidance services.
8. **`frontend/src/app/core/theme-tokens.ts` (197)** — comments describe history, not
   constraints: "styles.scss is not editable this wave" (line 11) and "extending D2" (line 2);
   also the deepest-nested data structure in the frontend (35-space indent token tree).
9. **`frontend/src/app/features/map/map-page.ts` (950) + `map-page.scss` (704)** — heaviest
   history-tone comments in the frontend main code (10 hits); one file holds the whole map UI
   (pins, legend, sidebar, address-result list — the surface whose spacing was just decided in
   `docs/closing-decisions-2026-09-24.md` §4).
10. **`src/main/java/ee/sheltermap/api/ApiErrorHandler.java` (515)** — the central
    exception→HTTP mapping at 31 nesting levels; every backend lane touches it indirectly, so
    flat early-return structure here pays back everywhere.

Honourable mentions: `DocumentationFactsTest.java` (1,891 — guard, simplify expression only),
`guidance-editor.ts` (1,429 + 2,032 spec), `GuidanceServiceTest.java` (1,639 — mirrors the god
class), `app/ShelterService.java` (509 — addPlace/normalisation/geometry in one service).
Naming suspects for BE-RECON to confirm: `isDampenedFor` (ShelterReportService:291),
`ProvenanceFilter`, `batchesFor`, `Lest97*` (Estonian CRS — needs one explanatory comment each).

---

## 5. Lane count and batches

**49 lanes** → **4 batches** (16 + 16 + 16 + 1). RUN.md's
recon batch 1 — INVENTORY / FIND-SKILLS / BE-RECON — precedes these; numbered 2–5 to
follow it.

| Batch | Lanes | Split | Lines | Shared lanes inside (dispatch first) |
|---:|---:|---|---:|---|
| 2 | 16 | 12 BE / 4 FE | 36931 | — |
| 3 | 16 | 11 BE / 5 FE | 48971 | `FE-SHARED-PAGE` |
| 4 | 16 | 4 BE / 12 FE | 47194 | `BE-PERSISTENCE-TESTS`, `FE-SHARED-CONTROLS`, `FE-MODELS`, `FE-I18N-CATALOGS`, `FE-STYLES` |
| 5 | 1 | 0 BE / 1 FE | 3180 | — |

Batch rules that make the split safe:
- **Disjoint files** in every batch (asserted); every file in a batch belongs to exactly one lane.
- **At most one `shared/**` lane per batch**: `FE-SHARED-PAGE` (batch 3) and
  `FE-SHARED-CONTROLS` (batch 4) run in separate batches. Batch 4 additionally carries the
  three file-based shared lanes `FE-MODELS`, `FE-I18N-CATALOGS`, `FE-STYLES` — *different*
  files from each other, but dispatch them **before** the batch 4 feature lanes (or move
  them to batch 5 if you prefer strict one-shared-lane-per-batch).
- `BE-PERSISTENCE-TESTS` shares batch 4 with the three persistence main lanes: it must keep
  base-class signatures stable; any change a persistence main lane needs goes through NOTES.
- `pom.xml` / `.github/workflows/ci.yml`: no owner in any batch; changes are NOTES requests,
  applied serially by the parent.
- Suggested intra-batch order: shared lanes → god-file lanes → directory lanes (parents can
  reorder freely; the gate is per-lane and files never collide).

**Verification of the split:** the generator asserts (a) every `src/main/java/**`,
`src/test/java/**` and `frontend/src/app/**` file (plus the `frontend/src` bootstrap files) is
owned by exactly one lane, and (b) every batch is ≤ 16 lanes with no lane in two batches.
