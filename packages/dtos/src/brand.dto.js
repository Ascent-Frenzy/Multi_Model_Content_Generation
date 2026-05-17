"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfirmAssetDto = exports.GetUploadUrlDto = exports.UpdateBrandProfileDto = exports.CreateBrandProfileDto = void 0;
const class_validator_1 = require("class-validator");
class CreateBrandProfileDto {
}
exports.CreateBrandProfileDto = CreateBrandProfileDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBrandProfileDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['professional', 'casual', 'humorous', 'inspirational']),
    __metadata("design:type", String)
], CreateBrandProfileDto.prototype, "tone", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBrandProfileDto.prototype, "primaryColor", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBrandProfileDto.prototype, "secondaryColor", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBrandProfileDto.prototype, "fontFamily", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateBrandProfileDto.prototype, "logoS3Key", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateBrandProfileDto.prototype, "isDefault", void 0);
class UpdateBrandProfileDto {
}
exports.UpdateBrandProfileDto = UpdateBrandProfileDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateBrandProfileDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['professional', 'casual', 'humorous', 'inspirational']),
    __metadata("design:type", String)
], UpdateBrandProfileDto.prototype, "tone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateBrandProfileDto.prototype, "primaryColor", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateBrandProfileDto.prototype, "secondaryColor", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateBrandProfileDto.prototype, "fontFamily", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateBrandProfileDto.prototype, "logoS3Key", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateBrandProfileDto.prototype, "isDefault", void 0);
class GetUploadUrlDto {
}
exports.GetUploadUrlDto = GetUploadUrlDto;
__decorate([
    (0, class_validator_1.IsEnum)(['clip', 'image', 'audio']),
    __metadata("design:type", String)
], GetUploadUrlDto.prototype, "type", void 0);
class ConfirmAssetDto {
}
exports.ConfirmAssetDto = ConfirmAssetDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConfirmAssetDto.prototype, "s3Key", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConfirmAssetDto.prototype, "filename", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['clip', 'image', 'audio']),
    __metadata("design:type", String)
], ConfirmAssetDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConfirmAssetDto.prototype, "mimeType", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], ConfirmAssetDto.prototype, "sizeBytes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ConfirmAssetDto.prototype, "durationSecs", void 0);
