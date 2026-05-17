"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfirmAssetDto = exports.GetUploadUrlDto = exports.UpdateBrandProfileDto = exports.CreateBrandProfileDto = void 0;
const tslib_1 = require("tslib");
const class_validator_1 = require("class-validator");
class CreateBrandProfileDto {
}
exports.CreateBrandProfileDto = CreateBrandProfileDto;
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], CreateBrandProfileDto.prototype, "name", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsEnum)(['professional', 'casual', 'humorous', 'inspirational']),
    tslib_1.__metadata("design:type", String)
], CreateBrandProfileDto.prototype, "tone", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], CreateBrandProfileDto.prototype, "primaryColor", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], CreateBrandProfileDto.prototype, "secondaryColor", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], CreateBrandProfileDto.prototype, "fontFamily", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], CreateBrandProfileDto.prototype, "logoS3Key", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    tslib_1.__metadata("design:type", Boolean)
], CreateBrandProfileDto.prototype, "isDefault", void 0);
class UpdateBrandProfileDto {
}
exports.UpdateBrandProfileDto = UpdateBrandProfileDto;
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], UpdateBrandProfileDto.prototype, "name", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['professional', 'casual', 'humorous', 'inspirational']),
    tslib_1.__metadata("design:type", String)
], UpdateBrandProfileDto.prototype, "tone", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], UpdateBrandProfileDto.prototype, "primaryColor", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], UpdateBrandProfileDto.prototype, "secondaryColor", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], UpdateBrandProfileDto.prototype, "fontFamily", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], UpdateBrandProfileDto.prototype, "logoS3Key", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    tslib_1.__metadata("design:type", Boolean)
], UpdateBrandProfileDto.prototype, "isDefault", void 0);
class GetUploadUrlDto {
}
exports.GetUploadUrlDto = GetUploadUrlDto;
tslib_1.__decorate([
    (0, class_validator_1.IsEnum)(['clip', 'image', 'audio']),
    tslib_1.__metadata("design:type", String)
], GetUploadUrlDto.prototype, "type", void 0);
class ConfirmAssetDto {
}
exports.ConfirmAssetDto = ConfirmAssetDto;
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], ConfirmAssetDto.prototype, "s3Key", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], ConfirmAssetDto.prototype, "filename", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsEnum)(['clip', 'image', 'audio']),
    tslib_1.__metadata("design:type", String)
], ConfirmAssetDto.prototype, "type", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], ConfirmAssetDto.prototype, "mimeType", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsInt)(),
    tslib_1.__metadata("design:type", Number)
], ConfirmAssetDto.prototype, "sizeBytes", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    tslib_1.__metadata("design:type", Number)
], ConfirmAssetDto.prototype, "durationSecs", void 0);
//# sourceMappingURL=brand.dto.js.map