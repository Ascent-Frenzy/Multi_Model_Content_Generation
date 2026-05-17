"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RescheduleDto = void 0;
const tslib_1 = require("tslib");
const class_validator_1 = require("class-validator");
class RescheduleDto {
}
exports.RescheduleDto = RescheduleDto;
tslib_1.__decorate([
    (0, class_validator_1.IsDateString)(),
    tslib_1.__metadata("design:type", String)
], RescheduleDto.prototype, "scheduledAt", void 0);
tslib_1.__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    tslib_1.__metadata("design:type", String)
], RescheduleDto.prototype, "caption", void 0);
//# sourceMappingURL=schedule.dto.js.map