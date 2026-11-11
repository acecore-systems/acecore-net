# Meta 翻訳ジョブの運用

mainへの対象source更新後、従来どおり15分待機して最新sourceを照合し、Meta Responsesの `muse-ember-1.0` / `medium` を background で送信する。入力・出力は `store: true` で Meta 側に一時保存される。JSON schema、出力token上限、sourceHash、翻訳Bot PR とCIは維持する。旧OpenAI Batchは新規送信せず、既存の未回収分を従来のcollectorで回収する。

`translation/meta-journal` branch の `.translation-meta/journal.json` に要求hash、source識別子、送信状態、受理response IDだけを保存する。原文、翻訳本文、APIキーは記録しない。GitHub contents APIの更新SHAで同時実行を調停し、POST前に `dispatching` を保存する。POST応答が消失した場合はID不明として自動再送しない。受理IDはjournalと30日保持のActions artifactに記録する。受理直後のjournal書込失敗時はreceipt artifactから照合し、不明状態を確認してから復旧する。

定期collectorは受理IDをGETして全件の終了を確認し、既存のsourceHash検査に合う結果だけを既存の翻訳PR経路へ渡す。PR作成または変更不要の処理済み記録が成功した後にjournalをprocessedにし、Meta側responseを削除する。削除に失敗したIDはjournalに残し、後続collectorで再試行する。unknownや未送信が残るgroupは適用しない。Metaの保存期限は未確認であり、受理後は早めに回収する。

GitHub Actionsの `META_TRANSLATION_API_KEY` と `GITHUB_TOKEN` のcontents writeが必要。APIキー自体はjournal、artifact、ログに保存しない。送信元のsourceが更新された結果は適用時のhash照合で破棄する。POST不明状態や失敗groupはjournalと該当run artifactを確認し、プロバイダー状態を照合してから手動復旧する。

## 合成 probe と復旧

既存の submit workflow を `workflow_dispatch` で `probe_only=true` にして実行すると、指定refの `github.sha` をcheckoutし、通常の翻訳投入・journal更新・PR作成を行わず、固定の合成文字列1件だけを同じ翻訳schemaで POST → GET → DELETE する。受理IDと状態は `meta-translation-probe-<run id>-<attempt>` artifactに保存する。GET失敗や未完了ではIDを残し、送信や削除を自動で繰り返さない。

Metaへの送信にはgroup IDとrequest hashだけをmetadataとして付ける。受理後のjournal書込が失敗してreceipt artifactにIDが残った場合、取得した `meta-translation-receipts.jsonl` を使い `node --experimental-strip-types scripts/reconcile-meta-translation.ts <receipt-file>` で復旧できる。GitHub repository/token/SHA と Meta key は安全な環境変数から与える。このコマンドはMetaにGETし、返却metadataとjournalのgroup・request hashを照合してからIDを記録する。新しいPOSTは送らない。receiptもIDも存在しない `dispatching` は結果不明なので、自動再送せずprovider側と作業記録を確認する。

明示的な429のみ短いbackoffで最大3回まで再試行し、それでも429なら未送信に戻す。ネットワーク障害・5xxやID不明は送信済みの可能性を残す。providerのgroup内失敗分は旧Batchと同様に適用対象から除外し、正常な結果のみsourceHashを確認する。
