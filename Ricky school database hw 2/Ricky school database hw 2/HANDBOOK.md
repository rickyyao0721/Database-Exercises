# 電影院訂票管理系統｜SQL 互動練習室 升級版講義

> 給原作者的說明：這份講義說明「升級了什麼、為什麼這樣設計、怎麼用」。

## 1. 你的原版 vs. 升級版

| 項目 | 原版 | 升級版 |
|---|---|---|
| 資料表 | 5 張（Members、Movies、Showtimes、Seats、Bookings），每表 4–8 筆 | **7 張**（新增 Halls、Reviews），每表 **12–60 筆** |
| 查詢題目 | 兩個示範（版本 A／B） | **10 題**（基礎 3、進階 5、挑戰 2），SQL 已預填、可直接執行 |
| 結果驗證 | 手動肉眼比對 | **自動比對**「預期結果」與「你的結果」，並顯示 ✅／❌ 與差異原因 |
| 資料庫設計 | 表格列表 | 可點擊的 **ERD 圖**、每張表欄位與 DDL、完整性限制（PK／FK／UNIQUE／CHECK） |
| 其他 | — | 資料瀏覽、自由練習區、資料異動（INSERT／UPDATE／DELETE）與一鍵重設、執行計畫、CSV 匯出、進度記錄、版本 A/B 即時比較頁 |

## 2. 原版資料的處理（請注意）

我讀取原網頁時發現兩個小問題，升級版已修正：

1. **版本 A 預期合計寫 1,230 元，但依原樣本資料算 paid 合計是 1,530 元**（320+320+300+280+310）。應是筆誤。升級版的預期結果由資料庫即時計算，不再手寫數字，避免不一致。
2. **訂單 4007 使用座位 C1，但 Seats 沒有 C1**（違反外鍵）。升級版座位擴充為 A1–E4 共 20 個，並開啟 `PRAGMA foreign_keys = ON`。

原版保留的內容：電影 201–204、場次 301–304、訂單 4001–4007 的狀態與金額、四位會員（林小安、陳柏宇、王怡婷、張家豪）。

**需要你確認：** 網頁文字看不到原始碼，所以原版的 member_id、email、join_date、座位類型、場次時間與廳別，我是自行設定的。若你有原始數值，請告訴我或自行改 `site/js/seed.js` 的對應 INSERT。

## 3. 資料庫設計

```
Halls ──< Showtimes >── Movies
              │             │
              └──< Bookings >── Seats        Reviews >── Members / Movies
                      │
                   Members
```

| 資料表 | 筆數 | 說明 |
|---|---|---|
| Halls | 12 | 影廳（名稱、容量、螢幕類型；每廳都有排場次） |
| Members | 16 | 會員（一般／銀卡／金卡） |
| Movies | 17 | 電影（其中 212、217 刻意沒有場次） |
| Showtimes | 28 | 場次（電影 × 廳 × 時間 × 基本票價） |
| Seats | 20 | 座位（A1–E4，一般／舒適／情侶／包廂） |
| Bookings | 60 | 訂單（paid／pending／cancelled） |
| Reviews | 20 | 電影評分 1–5 |

重點：
- **Bookings 是關聯表**，用三個外鍵把會員、場次、座位串起來（會員與場次是多對多）。
- **完整性限制**：`status` 只能是三種值、`score` 只能 1–5、`email` 與 `seat_code` 不可重複。
- **刻意埋的測試情境**：沒有場次的電影（212、217）、從沒訂票的會員（1012、1016）、只有取消單的會員（1011），用來練習 LEFT JOIN 與 NOT EXISTS。

## 4. 10 題練習地圖

| 難度 | 題號 | 內容 |
|---|---|---|
| 基礎 | 1–3 | WHERE、ORDER BY / LIMIT、IN |
| 進階 | 4–8 | GROUP BY、HAVING、JOIN（2～4 張表）、票房統計 |
| 挑戰 | 9–10 | LEFT JOIN + COALESCE、RANK() 視窗函數 |

每題進入後，編輯區已**預先填好 SQL**，直接按「▶ 執行」即可看到結果並與預期比對。

## 5. 使用方式

**直接雙擊 `site/index.html` 即可**（不用伺服器）。或：

```bash
cd site
python3 -m http.server 8000      # 然後開 http://localhost:8000
```

- 左側選題 → 編輯區已有 SQL → 按「▶ 執行」(`Ctrl/⌘ + Enter`) → 右側看結果，上方顯示 ✅／❌。也可以改寫 SQL 試試。
- 「自由練習」可以寫任何 SQL。「執行計畫」顯示 `EXPLAIN QUERY PLAN`。
- 完成進度存在瀏覽器 localStorage，換瀏覽器會重新計算。

## 6. 專案結構

```
site/
├─ index.html          頁面
├─ css/style.css       樣式
├─ js/
│  ├─ app.js           主程式（資料庫、ERD、練習、比對）
│  ├─ exercises.js     題庫（想新增題目改這裡）
│  ├─ seed.js          建表與樣本資料（SQL）
│  └─ wasm-data.js     sql-wasm.wasm 的 base64 版
└─ vendor/
   ├─ sql-wasm.js      sql.js 1.10.3（SQLite 3.45 的 WebAssembly 版）
   └─ sql-wasm.wasm
```

為什麼有 `wasm-data.js`？瀏覽器直接開 `file://` 時不允許 `fetch` 載入 `.wasm`，所以把它以 base64 內嵌，雙擊就能跑；`vendor/sql-wasm.wasm` 仍保留作為原始檔。所有檔案都在本機，**不依賴 CDN，離線可用**。

### 新增一題的格式
```js
{id:'q11', level:2, topic:'JOIN', title:'題目名稱',
 q:'題目敘述',
 sql:"SELECT ...;",          // 參考答案，預期結果由它自動產生
 hint:'提示', why:'觀念解說',
 ordered:true}               // 需要排序才算對時加上；DML 題另加 verify:"SELECT ..."
```

## 7. 部署到 GitHub Pages（之後再做）

把 `site/` 內容放進 repo（例如 `docs/` 或根目錄），在 Settings → Pages 選擇該分支與資料夾即可，不需要 build。所有路徑皆為相對路徑。

## 9. 已驗證項目

- 在 Chrome headless 以 `file://` 開啟，SQLite 引擎成功載入、無外部連線需求。
- 10 題的 SQL 皆能無錯誤執行並通過比對；同一批 SQL 也用系統的 `sqlite3` 指令列交叉驗證過。
- 尚未驗證：Safari／Firefox、手機版面（響應式樣式已寫但未實測）。
