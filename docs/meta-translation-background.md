# 共通モデル方針による翻訳Batchと既存Metaジョブの運用

## 新規翻訳の投入

mainへの対象source更新後、従来どおり15分待機して最新sourceを照合する。新規翻訳は、非公開の [ai-model-router](https://github.com/acecore-systems/ai-model-router) の `text.batch` を使い、OpenAI Batch APIへ投入する。初回採用版はGPT-6.1 Terra / high。モデル文字列と推論強度は共通カタログから解決し、このrepoでは指定しない。JSON schema、出力token上限、sourceHash、翻訳Bot PRとCIは維持する。

`config/ai-model-router.json` は採用するcore commit、policy revisionと機能宣言だけを持つ。workflowは専用の読取tokenでそのcommitをcheckoutし、`dist/stable.json` が示す版・SHA-256を確認して、共通クライアントで用途を解決する。カタログ全体・根拠URL・共通クライアントのソースはこの公開repoへコピーしない。入力が長くなる可能性は機能宣言の `long_input_expected` へ記録し、実行時トークン数によるモデル自動切替は行わない。

### 有効化の条件

- `AI_MODEL_ROUTER_READ_TOKEN`: `acecore-systems/ai-model-router` のContentsを読める、承認済みの専用token。通常の `GITHUB_TOKEN` が別の非公開repoを読めるとは扱わない。
- `OPENAI_TRANSLATION_API_KEY`: BatchとファイルAPIを利用するキー。
- 既存の `GITHUB_TOKEN`: このrepoのjournal branchへのContents書込み。
- 翻訳PRを作る既存Botの設定と、結果適用後の既存CI。

共通repoの読取tokenまたはOpenAIキーがなければ、workflowは新規投入前に明示的に失敗する。別モデル・Metaへの自動フォールバックは行わない。checkoutしたtokenはgit設定に残さない。PR用CIはmockテストだけを実行し、core checkout・生成API・本番投入は行わない。

有効化前に、旧コードのsubmit workflowが終了していることを確認する。新規投入直前に既存Meta journalを読み、未処理groupに同一custom_id（sourceHash・locale・pathを含む）がある要求は除外する。journalを取得できない場合も新規投入を止める。Meta collectorが処理済みにするまで別providerへ二重投入しない。

### 受付情報と再試行

`translation/openai-journal` branchの `.translation-openai/journal.json` に、要求のhash、受付時のcore commit・設定版・用途・モデル・推論強度、file/batch ID、処理状態を保存する。これはBatchアダプターの受付情報であり、共通クライアントの完全な `ResolvedPlan` ではない。原文、翻訳本文、APIキー、根拠資料は含めない。

file upload前に `uploading`、Batch POST前に `dispatching` をGitHub contents APIのSHA付き更新で予約する。応答消失・5xx・不正な受理IDは不明状態として保持し、自動で再送しない。明示的な429だけを再実行可能な状態へ戻す。同じ要求は別groupでも重複投入せず、受付後に中央の採用版が更新されても保存したモデルと設定版を維持する。

受理IDは30日保持の `openai-translation-journal-submit-<run id>-<attempt>` artifactにも記録する。受理直後のjournal保存に失敗した場合はartifactのIDとOpenAIのGET結果を照合し、Batch metadataの `submission_key` とinput file IDが一致することを確認してからjournalを復旧する。確認できない不明状態を `prepared` に戻して再送しない。明示失敗や保存容量上限も手動確認の対象とし、受付履歴を自動削除しない。

collectorは受付時のBatch IDとprovider metadataで回収し、最新coreの読取を必要としない。sourceHashが現在の日本語sourceと一致する結果だけを適用する。新規投入を止める場合もcollectorとキーを残し、受理済みの結果を回収する。採用版更新時はcore commitとpolicy revisionを一緒に変更し、通常のPR・CIを通す。

## 既存Metaジョブの回収

以前受理したMeta Responsesの `muse-ember-1.0` / `medium` のbackgroundジョブは、従来のjournalとcollectorを使って回収する。新規の通常翻訳投入はこの経路を使わない。Metaの入力・出力は `store: true` で提供元に一時保存される。旧OpenAI Batchを含む既存未回収分も従来のcollectorで回収する。

`translation/meta-journal` branch の `.translation-meta/journal.json` に要求hash、source識別子、送信状態、受理response IDだけを保存する。原文、翻訳本文、APIキーは記録しない。GitHub contents APIの更新SHAで同時実行を調停し、POST前に `dispatching` を保存する。同一の要求内容はgroupをまたいで同じ送信状態とresponse IDを共有する。POST応答が消失した場合はID不明として自動再送しない。受理IDはjournalと30日保持のActions artifactに記録する。受理直後のjournal書込失敗時はreceipt artifactから照合し、不明状態を確認してから復旧する。

定期collectorは受理IDをGETして全件の終了を確認し、既存のsourceHash検査に合う結果だけを既存の翻訳PR経路へ渡す。PR作成または変更不要の処理済み記録が成功した後にjournalをprocessedにし、Meta側responseを削除する。同一responseを参照するすべてのgroupの処理完了後に削除を予約し、削除失敗時は同一要求を待機させて後続collectorで再試行する。unknownや未送信が残るgroupは適用しない。Metaの保存期限は未確認であり、受理後は早めに回収する。

既存Metaジョブの回収にはGitHub Actionsの `META_TRANSLATION_API_KEY` と `GITHUB_TOKEN` のcontents writeが必要。APIキー自体はjournal、artifact、ログに保存しない。送信元のsourceが更新された結果は適用時のhash照合で破棄する。POST不明状態や失敗groupはjournalと該当run artifactを確認し、プロバイダー状態を照合してから手動復旧する。

## 合成 probe と復旧

既存の submit workflow を `workflow_dispatch` で `probe_only=true` にして実行すると、指定refの `github.sha` をcheckoutし、通常の翻訳投入・journal更新・PR作成を行わず、固定の合成文字列1件だけを同じ翻訳schemaで POST → GET → DELETE する。受理IDと状態は `meta-translation-probe-<run id>-<attempt>` artifactに保存する。GET失敗や未完了ではIDを残し、送信や削除を自動で繰り返さない。

Metaへの送信にはgroup IDとrequest hashだけをmetadataとして付ける。受理後のjournal書込が失敗してreceipt artifactにIDが残った場合、取得した `meta-translation-receipts.jsonl` を使い `node --experimental-strip-types scripts/reconcile-meta-translation.ts <receipt-file>` で復旧できる。GitHub repository/token/SHA と Meta key は安全な環境変数から与える。このコマンドはMetaにGETし、返却metadataとjournalのgroup・request hashを照合してからIDを記録する。新しいPOSTは送らない。receiptもIDも存在しない `dispatching` は結果不明なので、自動再送せずprovider側と作業記録を確認する。

明示的な429のみ短いbackoffで最大3回まで再試行し、それでも429なら未送信に戻す。ネットワーク障害・5xxやID不明は送信済みの可能性を残す。providerのgroup内失敗分は旧Batchと同様に適用対象から除外し、正常な結果のみsourceHashを確認する。
