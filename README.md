# WBD Pitchcall

同じ投手・打者の配球から、実際に打ち取った打席を選ぶゲーム。

**公開サイト： https://aoinu.github.io/wbd-pitchcall/**

## データとルール

- 出題：WBD Metrics Viewerの分析対象canonicalデータから、Official 2026 Summerに投球実績のある投手に限定。Officialは同じLeague・Season、Independent・OtherはSeason未設定のため同じLeagueから組み合わせ、最終球位置条件を通過した78問（元候補403問）。
- 同じ投手ID・打者ID・投打の左右・球数。OfficialはSeasonも一致。Independent・OtherはLeague一致で照合。カウントや位置の一致は不要。1球打席も含む。
- 1ゲーム内では同じ投手・打者IDの組み合わせを重複出題しない。出題数の上限は、選択可能な異なるペア数（最大10問）。
- 本塁打 vs 三振・ゴロアウト・フライアウト。未完了・投球欠落・打者セーフ記録と矛盾するアウト・併殺・途中で対戦条件が変わる打席は除外。
- アウトはWBDMVの打席復元結果。状態推定を含む。回答後の投球一覧に推定結果を注記。
- ヒント：Official＋Independent＋Otherの取得時点で利用可能な全期間、385試合。投手は対戦打者の左右、打者は対戦投手の左右で分ける。出題後の成績も含む。
- プロフィール画像： [Slaris WBD AnalyzerのCards](https://slaris29.github.io/WBD_Analyzer_/#cards) に組み込まれた選手名→画像番号マップ398件を保存し、出題選手92人中87人の画像URLを解決。残りは頭文字アバターを表示。対応表は `site/data/profile-image-index.json`、選手ごとの画像番号とURLは `site/data/questions.json` から参照できる。
- 空振り率＝resolvedCallがswingの球数÷スイング数。スイングはswing・contact・foul。平均球速は球速が有効な球のみ。打席数はterminalの球数。
- コース：投手視点。zoneX/zoneYはWBDMVと同じ表示向きで、左右打者のシルエットにはWBDMVの画像を使用。各軸±2.0を超える投球位置は±2.0に丸める。最終球の元位置がどちらかの軸で±1.2を超えるペアは除外。
- 結果は回答前の画面で伏せるが、公開JSONから取得可能。競技的な不正防止機構はない。

データ取得日時・元ビルド・出題スコープ別件数・ヒントの対象期間・プロフィール画像マップの出典は `site/data/questions.json` のmetadataに記録する。適格な78問と問題に必要な投球情報、選手ヒントのみ公開し、raw CSV、認証情報、D1の全データは収録しない。

位置条件：候補403問のうち、いずれかの最終球位置が各軸±1.2を超える325問（80.6%）を除外し、78問を掲載。割合と集計条件は `site/data/questions.json` のmetadataに記録。

## ローカル表示と検証

Node.js 24、pnpm 10.34.4。追加依存のインストールは不要。

```sh
pnpm check
pnpm serve
```

http://127.0.0.1:8080/ にアクセス。実装はbuild不要のHTML/CSS/ES modules。Bootstrap 5.3.8のCSSを同梱。

## 問題の更新

WBDMVの承認済み読み取り専用スナップショットを使う。生成処理自体は本番に接続しない。

```sh
node scripts/generate-data.mjs /path/to/wbd-metrics-viewer <dataset-id>
pnpm check
```

WBDMVの `validateDataset` でmanifest、ファイルサイズ、チェックサムを検証し、`buildCanonicalGames` で選手IDと打席を復元する。出題対象の投手はOfficial 2026 Summerの投球実績で決め、Officialは同Season、Independent・Otherは同Leagueでペアを作る。ヒントは3スコープ全期間から再集計。WBDMV側のanalyze-and-publishパッケージがbuild済みであることが必要。

生成したJSONをレビューしてmainへ反映すると、GitHub Actionsが検証し、`site/`だけをGitHub Pagesへデプロイする。PagesのSourceはGitHub Actionsに設定する。PRでは検証のみ実行する。

## クレジット

ゲームの着想：[PITCHCALL](https://pitchcall.pages.dev/)（@Eikura__Metrics）。UI・コード・問題データはWBD向けに作成。Bootstrapのライセンスは `site/vendor/LICENSE.bootstrap`。
