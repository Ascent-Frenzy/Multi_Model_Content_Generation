"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateContentDto = exports.SlideUpdateDto = exports.CreateReelDto = exports.CreateCarouselDto = void 0;
const tslib_1 = require("tslib");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class CreateCarouselDto {
}
exports.CreateCarouselDto = CreateCarouselDto;
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], CreateCarouselDto.prototype, "topic", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], CreateCarouselDto.prototype, "brandProfileId", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], CreateCarouselDto.prototype, "title", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(2),
    (0, class_validator_1.Max)(10),
    tslib_1.__metadata("design:type", Number)
], CreateCarouselDto.prototype, "slideCount", void 0);
class CreateReelDto {
}
exports.CreateReelDto = CreateReelDto;
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], CreateReelDto.prototype, "topic", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], CreateReelDto.prototype, "brandProfileId", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], CreateReelDto.prototype, "title", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], CreateReelDto.prototype, "voiceId", void 0);
class SlideUpdateDto {
}
exports.SlideUpdateDto = SlideUpdateDto;
tslib_1.__decorate([
    (0, class_validator_1.IsInt)(),
    tslib_1.__metadata("design:type", Number)
], SlideUpdateDto.prototype, "order", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], SlideUpdateDto.prototype, "headline", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], SlideUpdateDto.prototype, "body", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], SlideUpdateDto.prototype, "bgColor", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], SlideUpdateDto.prototype, "textColor", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], SlideUpdateDto.prototype, "bgImageS3Key", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], SlideUpdateDto.prototype, "overlayImageS3Key", void 0);
class UpdateContentDto {
}
exports.UpdateContentDto = UpdateContentDto;
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], UpdateContentDto.prototype, "title", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], UpdateContentDto.prototype, "script", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SlideUpdateDto),
    tslib_1.__metadata("design:type", Array)
], UpdateContentDto.prototype, "slides", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    tslib_1.__metadata("design:type", Array)
], UpdateContentDto.prototype, "segments", void 0);
//# sourceMappingURL=content.dto.js.map