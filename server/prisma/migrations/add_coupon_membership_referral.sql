// ==================== 优惠券系统 ====================

model Coupon {
  id          String   @id @default(uuid())
  code        String   @unique
  name        String
  description String?  @db.Text
  type        CouponType
  value       Decimal  @db.Decimal(10, 2) // 折扣值（百分比或固定金额）
  minPurchase Decimal? @map("min_purchase") @db.Decimal(10, 2)
  maxDiscount Decimal? @map("max_discount") @db.Decimal(10, 2)
  
  usageLimit     Int?     @map("usage_limit")
  userUsageLimit Int?     @map("user_usage_limit")
  usedCount      Int      @default(0) @map("used_count")
  
  startDate DateTime? @map("start_date")
  endDate   DateTime? @map("end_date")
  
  applicablePlatforms  Json? @map("applicable_platforms")
  applicableCategories Json? @map("applicable_categories")
  
  status    CouponStatus @default(ACTIVE)
  createdAt DateTime     @default(now()) @map("created_at")
  updatedAt DateTime     @updatedAt @map("updated_at")
  
  usages CouponUsage[]
  
  @@index([code])
  @@index([status])
  @@map("coupons")
}

enum CouponType {
  PERCENTAGE
  FIXED
  FREE_SHIPPING
}

enum CouponStatus {
  ACTIVE
  INACTIVE
  EXPIRED
}

model CouponUsage {
  id        String   @id @default(uuid())
  couponId  String   @map("coupon_id")
  userId    String   @map("user_id")
  orderId   String   @map("order_id")
  createdAt DateTime @default(now()) @map("created_at")
  
  coupon Coupon @relation(fields: [couponId], references: [id], onDelete: Cascade)
  
  @@index([couponId])
  @@index([userId])
  @@index([orderId])
  @@map("coupon_usages")
}



