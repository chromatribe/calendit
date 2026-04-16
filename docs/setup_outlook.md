# Outlook (Microsoft Graph) API セットアップガイド

`calendit` で Outlook カレンダーを操作するには、Microsoft Entra ID (旧 Azure AD) でアプリケーションを登録し、クライアント ID を取得する必要があります。

## 手順 1: アプリケーションの登録

1.  [Azure Portal - アプリの登録](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade) にアクセスします。
2.  **「+ 新規登録」** をクリックします。
3.  **名前**: `calendit` (任意)
4.  **サポートされているアカウントの種類**:
    - 個人用アカウント（Outlook.com等）も使用する場合は **「任意の組織のディレクトリ内のアカウントと、個人の Microsoft アカウント」** を選択します。
5.  **リダイレクト URI (省略可能)**:
    - プラットフォームを選択で **「パブリック クライアント (モバイル、デスクトップ)」** を選択します。
    - URI に `http://localhost:3000` を入力します。
6.  **「登録」** をクリックします。

## 手順 2: クライアント ID の取得

1.  登録したアプリの「概要」ページが表示されます。
2.  **「アプリケーション (クライアント) ID」** をコピーします。これが `id` として使用されます。
3.  （組織アカウントのみの場合）必要に応じて **「ディレクトリ (テナント) ID」** もコピーします。

## 手順 3: 権限の確認 (API のアクセス許可)

1.  左メニューの **「API のアクセス許可」** を選択します。
2.  **「Microsoft Graph」** の **「情報の種類: 委任」** に以下の権限が含まれているか確認します（通常、新規登録時は `User.Read` が付与されています）。
    - `Calendars.ReadWrite`
    - `offline_access`
3.  足りない場合は「+ アクセス許可の追加」から追加してください。

## 手順 4: `calendit` への設定

ターミナルで以下のコマンドを実行して、クライアント ID を設定します。

```bash
# クライアントIDを設定
calendit config set-outlook --id <コピーしたクライアントID>

# 特定のテナントを指定する場合（通常は不要）
# calendit config set-outlook --id <クライアントID> --tenant <テナントID>
```

## 手順 5: ログイン

設定が完了したら、以下のコマンドで Microsoft アカウントにログインします。

```bash
calendit auth login outlook
```

ブラウザが開くので、許可を与えてください。完了メッセージが表示されたらターミナルに戻ります。

---
これでセットアップは完了です！ `calendit cal list --set <コンテキスト名>` などでカレンダーが表示されるか確認してみましょう。
