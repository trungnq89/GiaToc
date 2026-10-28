# Gia Tộc (GiaToc) — Sổ Tay Họ Hàng & Nhận Diện Quan Hệ Local-First

Ứng dụng di động giúp ghi nhớ mối quan hệ trong họ hàng, nhận diện khuôn mặt người thân, xưng hô chuẩn xác và tìm kiếm tức thì.

Được xây dựng theo chuẩn kiến trúc kỹ thuật **Offline-first Architecture Blueprint** (kế thừa từ `Ezprocess`), ứng dụng hoạt động **100% độc lập trên thiết bị**, không cần máy chủ, không cần internet, bảo mật dữ liệu riêng tư tuyệt đối.

---

## 1. Tính năng cốt lõi

1. **Khởi tạo danh tính "Tôi" (Anchor Identity)**:
   - Bước đầu tiên xác định "Tôi là ai" (Họ tên, Giới tính, Năm sinh, Ảnh đại diện).
   - Mọi danh xưng (Bác, Chú, Cô, Cậu, Dì, Ông, Bà, Cháu...) được tính toán xoay quanh danh tính của bạn.
2. **Nhận diện gương mặt & Danh bạ trực quan**:
   - Lưu trữ ảnh chân dung người thân cục bộ (`${DocumentDirectory}/avatars/`) không bao giờ mất.
   - Hiển thị badge nhánh họ (Bên Nội, Bên Ngoại, Bên Vợ/Chồng) và tình trạng (Còn sống / Đã mất).
   - Gọi điện & nhắn tin tức thì chỉ bằng 1 chạm.
3. **Tìm kiếm nhanh tức thì (Quick Lookup)**:
   - Gõ tên ("Hùng", "Minh"), biệt danh ("Bé Bắp", "Cả"), hoặc cách xưng hô ("Bác", "Chú", "Dì 5") để tìm thấy ngay thông tin người thân.
4. **Tối ưu hiển thị di động theo Bậc Thế Hệ (Generational View)**:
   - Không dùng diagram gia phả cồng kềnh khó xem trên màn hình nhỏ.
   - Thay vào đó chia theo các tầng thế hệ rõ ràng:
     - **Bậc Ông Bà / Tiền Bối** (+2)
     - **Bậc Cha Chú / Cô Dì Bác** (+1)
     - **Thế Hệ Của Tôi** (0)
     - **Bậc Con Cháu Đời Sau** (-1, -2)
5. **Động cơ suy luận danh xưng (`kinshipCalculator`)**:
   - Kết hợp giữa suy luận trực hệ (Cha mẹ, con cái, vợ chồng, anh chị em) và cho phép gán nhãn tùy biến theo phong tục địa phương ("Bác Cả", "Dì Út", "Mợ Ba").
   - Hiển thị song song: *Tôi gọi người này là gì* và *Người này gọi Tôi là gì*.
6. **Sổ Ngày Giỗ & Kỷ Niệm (Memorial Events)**:
   - Lưu trữ ngày giỗ âm lịch (ví dụ: "15/07 Âm lịch") của ông bà, tổ tiên.
   - Ghi chú địa điểm làm giỗ, người đứng cỗ để con cháu luôn nhớ trọn đạo hiếu.
7. **Nạp dữ liệu mẫu & Đặt lại dữ liệu**:
   - Trong tab **Tôi** có nút *Nạp dữ liệu họ hàng mẫu* để trải nghiệm ngay gia phả 3 thế hệ mẫu.

---

## 2. Ngăn xếp công nghệ

- **Nền tảng**: React Native `0.87.1` (Bare, New Architecture, Bridgeless).
- **Ngôn ngữ**: TypeScript `6.x` (strict types).
- **Cơ sở dữ liệu cục bộ**: `react-native-sqlite-storage` v6.0.1 (kèm patch Gradle).
- **Quản lý State toàn cục**: `zustand` v5 + middleware `persist` (gate render qua `hasHydrated`).
- **Lưu cấu hình nhẹ**: `@react-native-async-storage/async-storage`.
- **Điều hướng**: `@react-navigation/native` + `native-stack` + `bottom-tabs` v7.
- **Biểu tượng (Icons)**: `react-native-vector-icons` (`MaterialCommunityIcons`).
- **Hình ảnh & Bộ nhớ**: `react-native-image-picker` + `@dr.pogodin/react-native-fs`.
- **Đa ngôn ngữ**: `i18next` + `react-i18next` (mặc định Tiếng Việt `vi`).
- **Kiểm thử logic**: `jest` + `@react-native/jest-preset`.

---

## 3. Cấu trúc thư mục

```
HoHang/
├── App.tsx                      # Root component: SafeArea -> StatusBar -> ToastProvider -> RootNavigator
├── android/                     # Cấu hình Gradle & AndroidManifest
├── ios/                         # Podfile & Info.plist
├── patches/                     # patch-package (react-native-sqlite-storage)
└── src/
    ├── types/index.ts           # Domain model hợp đồng chung toàn app
    ├── db/
    │   ├── database.ts          # Singleton SQLite (giatoc.db) + migrations
    │   └── repositories/        # personRepository, relationshipRepository, eventRepository, userRepository
    ├── store/                   # sessionStore (zustand persist)
    ├── navigation/              # RootNavigator, MainTabNavigator, types
    ├── screens/
    │   ├── onboarding/          # OnboardingScreen
    │   ├── home/                # HomeScreen (Danh bạ & Tìm kiếm nhanh)
    │   ├── relations/           # GenerationsScreen, PersonDetailScreen, PersonFormScreen
    │   ├── events/              # EventsScreen, EventFormScreen
    │   └── profile/             # ProfileScreen (Thông tin Tôi, thống kê, nạp mẫu)
    ├── components/              # Avatar, Card, Chip, AppButton, ScreenHeader, EmptyState, Toast, Icon
    ├── theme/                   # colors, spacing, typography
    ├── utils/                   # kinshipCalculator, avatarStorage
    └── i18n/                    # vi, en resources
```

---

## 4. Hướng dẫn chạy và phát triển

### 1. Cài đặt dependencies & áp patch:
```bash
npm install
npx patch-package
```

### 2. Chạy test logic:
```bash
npm test
```

### 3. Khởi động Metro bundler:
```bash
npm start
```

### 4. Chạy Android:
```bash
npm run android
```

### 5. Chạy iOS:
```bash
cd ios && pod install && cd ..
npm run ios
```
