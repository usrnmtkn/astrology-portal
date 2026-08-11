# LL V13 duplicate contentKey repair

Date: 2026-08-11

## Authority

Owner ruling 2026-08-11: For fallback-hook/natal-aspect-lived/moon/opposition/ascendant, keep the V13 copy ending "…somebody else's mood keeps deciding the whole day." For fallback-hook/placement-sign-lived/mars/cancer, keep the V13 copy ending "The anger builds when you cannot address it directly." For all 108 duplicated contentKeys, the V13 row supersedes the earlier row per the documented V13 precedence.

The governing ingestion record is `packages/astro-knowledge/review/ll-matrix-v13-ingestion-2026-08-10.md`. Its V13 exact-key precedence requires replacement, not append-order precedence.

## Root cause and repair

Commit `77f2602e` appended the 301 V13 runtime rows after existing rows. For 108 keys already present, that produced two canonical rows with the same `contentKey`. This repair deterministically keeps the single row whose `source_release` is `ll-matrix-v13-owner-approved-runtime` and removes the superseded earlier row. The transform is idempotent.

- Duplicate keys before repair: 108
- Superseded approved rows removed: 108
- Duplicate keys after repair: 0
- V13 rows retained: 301
- Non-removed approved-row fingerprint before: `250c7b9b6b045eb98bcf5f78e3c4e036a6f9deac8c01f3dba577edc735c246f3`
- Approved-row fingerprint after: `250c7b9b6b045eb98bcf5f78e3c4e036a6f9deac8c01f3dba577edc735c246f3`
- Other approved-row changes: 0

## Owner-ruled copy conflicts

### `fallback-hook/natal-aspect-lived/moon/opposition/ascendant`

- Dropped earlier copy: "Moon opposite the Ascendant can make another person's bad day become the schedule for yours. You cancel the plan, monitor their mood, change what you were going to do, and realize hours later that you never checked what you needed. Empathy gets costly when somebody else's emotional weather keeps deciding the whole day."
- Kept V13 copy: "Moon opposite the Ascendant can make another person's bad day become the schedule for yours. You cancel the plan, monitor their mood, change what you were going to do, and realize hours later that you never checked what you needed. Empathy gets costly when somebody else's mood keeps deciding the whole day."

### `fallback-hook/placement-sign-lived/mars/cancer`

- Dropped earlier copy: "Mars in Cancer can make a family problem stay with you long after the call ends. You are still irritated while making dinner, still replaying the criticism in bed, or eating too quickly because your body has not caught up with the fact that the argument is over. You can work incredibly hard for what feels personal. The anger gets heavier when it has nowhere direct to go."
- Kept V13 copy: "Mars in Cancer can make a family problem stay with you long after the call ends. You are still irritated while making dinner, still replaying the criticism in bed, or eating too quickly because your body has not caught up with the fact that the argument is over. You can work incredibly hard for what feels personal. The anger builds when you cannot address it directly."

## Per-key disposition

| contentKey | Kept V13 row SHA-256 | Dropped earlier row SHA-256 | Copy disposition |
|---|---|---|---|
| `fallback-hook/natal-aspect-lived/jupiter/quincunx/ascendant` | `9aa9ac4ffa721ae23748db4c33b05537570c09b88873e9104d7578bdb5e28f6f` | `83d9cc24841faf07c632660216749ea72f771a25c4b67aeacaf733bee60c3709` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/jupiter/quincunx/midheaven` | `5e27f79804676de22919bdacabf62720f4f41ca182d3c4d10a64acb5b5587782` | `962268f1a2b00c0527a677b65b3a2a29282f0b9dc79a5f77332b7029aeadf7f5` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/jupiter/quincunx/north-node` | `4976a55d35b7f17a3a22ff6fe4033b66ff6cc37e4a43b6fdf29c327efb1d96a5` | `fb59193034707602b69cd84bbaf8bd91469bcc03c0b1e024f4b40a532ce45977` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/jupiter/quincunx/pluto` | `c47f8008ee543548672a2898d1080397896f1a138bb0b902226f76d61994f960` | `63013d389d7cc53ce33a0727e9e807dbd5dd4408b5c5d265b6ccd5a8cc21ed14` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/jupiter/quincunx/saturn` | `91351dfbecd35b2cb8ffed76515140c6bf01f5aa0526b8cec07c1b536e26025a` | `ccbcb13c49d5414e1578535d6d9826e2ffd40ba2d4913e45d764d3b61fda7d15` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/jupiter/quincunx/south-node` | `acb07b00895295ab0566730bd4e06cf4017462d749a39bdb847a6ae4cb81b6f7` | `3862cd49191ed62a480ad2ed681fc7f35dfe710b263d926e7698ee1c6308c06c` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/jupiter/quincunx/uranus` | `79471797f35da2a1b3d4d94ad350564a6e92921c219056a9310d77588204eb0e` | `30a5bd9a1e1a30a69e4404a727e745bb4043119dc2d135d151fd2259f2971432` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/jupiter/sextile/part-of-fortune` | `caa30056da81a18ab165d7ee43531c8fadaf58dcf2fd8ca9428aec6a1497d0b9` | `7d031d725f4675a3e33a150594d0553d697d96edc6b366229a1aefc5f16f213b` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/jupiter/sextile/south-node` | `fec9ccac90309b95086a1b79cfffc82e07fd80001fcb8d3bda930a9cc526349b` | `08b562a61d51905d1ad52d6cfe96d8101b7c9911319268a522ee46db4dbd6756` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/mars/opposition/saturn` | `8f79e8e7ccbdcb03c6f0554fd6a0b5edbc112a680d92c590a6fa5e984bc4f3aa` | `337e5068a3ee6bf611361655f45220c4d7c1fee4e8f970248c1e251261bba18e` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/mars/quincunx/ascendant` | `41da975fefe642cd7d1933223edea8fe5f419636014868c9ee3808088ffef5b1` | `37620bdf9dd68521c003c2f84b933a5100694bd6361ab39301f9d30230e530bb` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/mars/quincunx/jupiter` | `7f92c91ab98fa2c8cf83a983f6a365766bf14b5f9bfe78ba0a8cd9d58e86c3cc` | `fa0b5098299e8174743464ff5d6755743b118beb74e78aafb9aeabff94165ed0` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/mars/quincunx/midheaven` | `362f7683c9d3f6374f22c12afc8c0df909bd3c9aad0155091c931e94543e221d` | `a0dfcb67dc901df6ecf94c487192ad2d0766e571a8b38e1794782795a02fa8fe` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/mars/quincunx/north-node` | `e65ffca0c4d3aef97657d441f0ff4f7db26044126695fb4c8d295dc820f53c46` | `a76e3cbd58ef9ee070dca6e4ef190d56344a48b556dc8f58948e779f1e30d088` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/mars/quincunx/pluto` | `31449f4b86503c8b3bbe1e3dacf06f88fca501f9a027997c55d1144bc2c4982d` | `2f6a7bac13be9ac7db5f2601e341117f664bc8898ad35201c23380fcf746d5a0` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/mars/quincunx/saturn` | `d422371e5f8f0e30924835255f47c98eb8cd9c3616f1ffb95eb4ccf91655a1c5` | `b9670591bf477bec912c9d6596581c1177528e0a93499e0e9adbaaa40ba272a5` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/mars/quincunx/south-node` | `b226d47f8e482f3fb7ff5f69a5324271ffac07acb59475daa5d2bb4f37e5f8a1` | `9411bb0f8da63dcc227fc6cc28e98fbee281b3517ef4acdcdf546df0453da1e9` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/mars/quincunx/uranus` | `d79631bbd563bdb7bc7606e1a69935718b80e85c11787a371f347302ff206918` | `bbbc7637b0e7f8b883c24341ae7c6ecbf927c3723542350729ac8782271f2af5` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/mars/sextile/jupiter` | `8efb598946dc3b219f96b0d83b96308d046635388fd3a2819aaf663a7d3328c8` | `5ed8fe047850643b85ba648088d9d637cd586a36f4b767d7abc984ef9e72c019` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/mars/sextile/part-of-fortune` | `67fd7ba0aa00acda3414fdc70b96a5a22aa9e630c104e89dd339d877da40b136` | `6b741e2c17e48dc530bc2eda4c5ff9f2b9039bcf304fafa1c7ce5bf940dc8e6c` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/mars/sextile/south-node` | `73d4dc918cc54000985923f281870acfa0f61910d3d7167bd8c99788f8369038` | `182341505c8b558afbea2708231567bf36d06e584166d2e1b74e31c49b84534b` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/mercury/opposition/midheaven` | `d505fef714fd13221a0e85be40ce565eaf2fa25c33a3d16a54fe9906f7be5e14` | `bc2a303c7f8641a14739081ad6dd22c3362046d5f2c154d2acc3ca2bbbf63b52` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/mercury/quincunx/ascendant` | `d815b86e0d2168da6c7882cf88e28d1fe51a9cedd78346fa1b3ab9166fb297f1` | `7d3bfe26f1ae19817660d69e2affada79e297558de15619323ef7f5a9d4d9fb1` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/mercury/quincunx/jupiter` | `824b0badf1329806921db464bd36c8fbbc50b973548d480edfe8da7d4062d1f5` | `5fa2f8cb66404627bbb0e8c2e3285140ece2ffbafd1f0c0271026d440d94a8f1` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/mercury/quincunx/mars` | `d0e3cadb78df19c42eceae29026b98f186f3e05c1d3d7471bfaf0d8579e8d1b5` | `f07c0d0c3c2ccaee56b879cc291f4a4d974d9db03617dfa6a10761a0745ba36f` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/mercury/quincunx/north-node` | `661236355a474a52804dbfe3e9f6b2bea2bebf0cb172afc6f1955d24f9b148d8` | `b4fc9d8665c36a4fa5c9ff4bfa394fe6d5fec89cd37872ec147e3bf829441c7d` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/mercury/quincunx/pluto` | `51ad12ba28eb0b359921d468b2a56f4b8c10ff4f210512668d31df9e16b0029b` | `acbcebf8a12414570ceb7a25c37b4a8f4324e22605522b5a37cc64ffd2114fbf` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/mercury/quincunx/saturn` | `696c6758614ab9b7ffb61117da272a2993ed057f857c49ef8c64ecb4d7244458` | `5d9eb8881f566725da86f94dea1d149e0d801606c333172bcf64d7029f9a4400` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/mercury/quincunx/south-node` | `ab002dd059c7847935034945e3ecbacb6955bd7d9ee8110c610b5f969d212cf0` | `6736da48ba86eb444f5d18e57322fff7cd330ef733510fc7ec01c2a6c360dcbb` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/mercury/quincunx/uranus` | `0e819d82f51442f8cbc333844f824cc0b5f898eff854eaa0958ea37af2017825` | `fa447fe20fff7484d1872fea76c84c6dfe8a5afd803872d2b908f9de84e0b3b7` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/mercury/sextile/mars` | `01d8efa2c97db43119fcd49efb3cf717ae10ca7a2e9b615dfabceb546824e39b` | `a8c855feaf225db0881b704f0ec7a939ac698585f3fc5578e8ef3a03f9f8c0ab` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/mercury/sextile/south-node` | `6e1d015327a28262306024db642efa205138943426d73ae8769789dfba2599b6` | `74486de222ae69e4fb90d6a1b49f1d4504129fe0f924a5f08c7405cb4c00442a` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/mercury/square/pluto` | `633437537cddb33ad1fd17d383fefa71d893d73ee6a3e0f17f0fed543dd7d189` | `0b1eb4009220bb8df916819f89b117100532a2bdd1da39c38f5fb4badc90fd40` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/moon/conjunction/mars` | `b47772a611a9b982d3f45320c90d1ec069d320607dc9c9e5b7d4b353cecf512e` | `5c9bacb5cdb44cd5637f0a288dbeabf2ee51a232d97919c5b58f26ec247efd76` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/moon/conjunction/neptune` | `dea61076c66da60c629da67d6713e12910c0a142afa624091894dee9fa165c2e` | `9a133e933f1bbc5a6ab7bc60cd3e49d5df579a750c8140f13f146cfb14baa88f` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/moon/opposition/ascendant` | `73f6cf17ecd99666a574341badacafad21f3c1df958d7dfeb13762cfa0100582` | `a9853aea2bb54288197ae1d53a135bc5cf20eb0a811bb9b177267c2c15e7c913` | owner-ruled V13 copy |
| `fallback-hook/natal-aspect-lived/moon/opposition/midheaven` | `8f7f79c6660dec56ec01f2fc09f7a82e5dd11dc9e47676a04d53e211b9f15167` | `a0cdfb53dce853a69b5408282a0f2105a78a02db15f89b8fe9847b4309df8ed7` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/moon/opposition/part-of-fortune` | `468374ab85ac9fcb725eb746d958d65b77c6fe838fc0da745028ba2c37e41245` | `41539b474e027e3326ff7bbe8aed35e1b4b5288bdafabdd9f38fcf9f3839cc00` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/moon/opposition/pluto` | `3d08e024c5e26bb09d6e21da52db049451c39445e52535e57d338e584b82dfb0` | `09abfc80c9797ea5052bb81a4cf5677b5e056a0c3a3f2ad0a1c936e263265043` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/moon/opposition/saturn` | `891b5aa01169f2c2454ee706b106a4210b6f04361f54c681277717774cc42135` | `4b25e489291442ff92e2a03827b62c47af8a0a11e07d9233596d0d6f0bbf6275` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/moon/quincunx/mars` | `fef1e1f53d06d5bc6aa1d7062c037ae7312754bfcd1e08c39ee784397547fc49` | `d2c7fdeba7cd6dd4dcb73abce7e245a7655bbb6b0035c73dbac4f31978a061a8` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/moon/quincunx/neptune` | `5741140d2da8776ed656dc7a843884886d2527f95998cf8dd6cc9eda74bde916` | `5d98b3b9d2040198753459c93585722fb8c2e58d3a5c9ac1cfce25c811d120e1` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/moon/quincunx/north-node` | `1ea0dd1b24bfb35d3dfb0d8a94f1d9931524456a40a4ea49a6dbe734f8361a43` | `fb698cd5f24f9c0f6c879bfcf8e71b5e9c7a1e27eae028e75c818d065c9587aa` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/moon/quincunx/saturn` | `5d6f81f6b099413e893ac217c670222289469a04b2160c9284b55db947358908` | `e3b2f6ed5a50b44a74abd296f5767a6fbdd33122349eed4d744c04e9f82b0092` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/moon/quincunx/south-node` | `ef84af601557e825b94f87774fad1bb2c69cdfaff9eaba614842a352c7fb94d1` | `a1d4d6454c4e70c35f5b6636f18b58dcca44ad55dd6eb0bb78587e181576135c` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/moon/quincunx/venus` | `2999bf08434bad37780e0f6f1970d7844fec241c9a1696c0c8e76a7794cd0e1a` | `767ace5aa55965bf22d4b7eefa9cffeb5610e30fa6f96e0ca32dbeaf97fec019` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/moon/sextile/mars` | `e801aaef6c48fe3ea82b7c39460256c15eff2235f48333438ebbe60e65254cb0` | `58df3891441476f297ce0ca91fd296ffa2bb5ee38628ef11b28bb5018e0cbdbf` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/moon/sextile/neptune` | `2ce918a292143b9e628038235ff9eeab1b7d82b3947932a1dacf65055434717a` | `1652d171aa941baa332e47d2e000c3e444dfe853d90569f930243d009162e7d2` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/neptune/quincunx/ascendant` | `2048b91b3244893628bea35b2408a548c2181f2ed31f4c3c0c3343137406ca3a` | `ffa76a1719f23148c105c3f8204bd052bdcd65b83411421dce039f83a65c4be8` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/neptune/quincunx/north-node` | `c9bb5292278e8777d9b219cbcf3c10e3ba5d5a9e064f5c12153404e9138ba20d` | `545fbb30204b71dbc396300c3b10cd1ab81ac63f3e99dd46658a9e1d8f7b0878` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/neptune/quincunx/south-node` | `f5aa8a107bb71ebef6dea05d9490c560adc488c06dceda4c6f9cc9e24d101864` | `506498d2a4be0cbc858498ff7dfe16901fbef941d2c7d870845422830d38bc41` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/neptune/sextile/part-of-fortune` | `41f98bbc6a0b5598b8205a4e72e17bff1ba15165822e096db8c54dcfd838e5e7` | `c58aee5a9ef26ad78a382a96c3cf33e615c2f541db11bbea1d0303feb9a803f4` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/neptune/sextile/south-node` | `e795c5dfdf17a190c2cc7b0ffad8d5725465f307126a791178250a62ed06b53b` | `d29080933616a89330386aae6b88a5d170f4ff04bed52fca4fe2931cee9b8b13` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/north-node/sextile/ascendant` | `e41639c463723699322dd7bb1f9e7c20d6c47090cfb37c4be51e6031cf003c46` | `b49db601d40f4cd3001694ec74226e50876be55fb39b61d45c304ea7d9cd2dd8` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/pluto/quincunx/ascendant` | `52b1759182606089aef3c8da73471d09ab7db02d894e869ea2e3eb4928fb5a18` | `bd2b69673abfa1acf8a8450274ecaa0de260eac3df3ace55ba750e65fb0f38ff` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/pluto/quincunx/north-node` | `b96a92fa38b6738fc91fae678004259fd1c9304ddd3dc0f50d48131abffeed21` | `fb0c4b33bfb59fb944fd97384df87773437b639f4538ce906c277bef70003a74` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/pluto/quincunx/south-node` | `89862e397bfa66b612e29709f75759d965fe76447fce2ee163a06c74e0a91b99` | `420baa4579f42ff396885571ca7b28298faa2dbf3247dd1666c14bde10b4a6ba` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/pluto/sextile/part-of-fortune` | `3b754c161babc25e6d62284257289b3cf05697fcb9f84989ffa1acb9b013d4f9` | `b562e40b0b5c551ca675295418de313fbdcb428ad0360e3592b16b026e85d065` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/pluto/sextile/south-node` | `8bf09d51f9a10007374e3f9604d4ffa10dc887b94b737901fd69a180d318bfbe` | `377cac3ac5b0aa0a8ad5143d3e4558de26417aedc0739dcddcffb91c4e984f38` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/saturn/opposition/neptune` | `5b28df6ec3bb9369eed8ee4da9c4dde8ed350cfbfcf4dde3cdbb100af5109f77` | `9a97ce4d79b317ffb07ebdc654b6350afc393ede085ecd27406fdd33e42d9765` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/saturn/quincunx/ascendant` | `81e5f7a7af8733ecdb5c9e6d2ded5c154dfbe805d029c86502e8876c3b4b59dc` | `676cca8e085ed9c8b02980e384efe096c8d4fd26fa3acaf3edf5e8c618385056` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/saturn/quincunx/neptune` | `35495e33533e381ec1dcc81b2c395a78e78394468fc4622e80d5d92fb2907e12` | `b29ce4ae1439afbb7bc2a649cff50a88aee6d071d3f5f854a0a6867ba5744751` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/saturn/quincunx/north-node` | `cef33cd77e79348488acee4bd64e93da85688194034faac9af14e784f83f67e9` | `3c182d39cb1371d4be83c389438d44001f92f60d26b63bd60c3ff2a33925b706` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/saturn/quincunx/pluto` | `33683f195927f19811f32f6007d5fa28d82b8a2eb036243d23033b5caae03538` | `95d96384a33feb377276b4497512c3ef059969564c0c796c6f0ba7470da01b17` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/saturn/quincunx/south-node` | `362f6b2c91f7022866aee98307ed9a1f1b234e8aaf352193370add9718fb4b33` | `ac68c4973a677958be562aa5954d49825337035ed85f17a28b0fe97c7d3a3047` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/saturn/quincunx/uranus` | `5db2f77f36ecb336d9318e38ff2baee4a3ddd2c13b8f569a77fc62d7051cc833` | `b928aaa7fd6fad9a6d6e9487aeffd351704169b983db41f6d60c451d06f25093` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/saturn/sextile/part-of-fortune` | `890dafdd7a36c50d828afd892f08d62944c31179c33b72408a38fee2ca7f2e49` | `0685351d9418d3af31d1be5d4a107fb5a07988cd39baa3173b86244e8b4d89e7` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/saturn/sextile/south-node` | `e830fb7fd1f9244403b9e596ab28fd2d8b58ec115404f1cb579ca01cf524dc59` | `d3ed7f6549822b6953974dd6ce0549428ae79bf63ca168c95357f4e657302a53` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/saturn/square/uranus` | `0e54ab5205161675063725b87f2a812fa51b389802f5acdf15067eea4bd02154` | `eb9754706f8463ad3aed85cd3c25abd6e8ec1fec06fdbc8e3d04833e6021b5ae` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/south-node/opposition/midheaven` | `6d18fe24ff709f2e042dcf4eb02a874f41c2bced2124ac2e9b4324fafd92305e` | `42f7716be2364c009d73019780885b8f34550a658dc022faca72ed9f488e7b24` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/south-node/quincunx/ascendant` | `4ee114971514163b9f200b017bbb8b23e922af8f56b506f05814f368d8dd8ebc` | `61e98f39f9a33417a8e2e8fb5c615dcda6831e9c246fbc68d12f9ccea98699c2` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/south-node/square/ascendant` | `22310b8f17bc38f1d95fb74ccf8d5bc0e4cd3d7fddd0d2f9ce1d28f74ee2e941` | `91c085c3a852b66bd50900e0ef0a5451dadd5512c1c5d1780db8203a5051cc00` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/sun/opposition/part-of-fortune` | `c14f20220f192fe730ab8753eb8af98e27354146ce89d898abe200b6b47b828d` | `e9f9cafb58343ad98d6c15d27afd12ddba8944d12f5373dbbfe8779b3e8f22cc` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/sun/quincunx/moon` | `b27eb9c6e1fe02e6c45570a8aeec1181dd4f04171cbd8fdf1a000a2e4147c527` | `b897f2c9c2205456ddfadea12d35f0a1f7fb3f95b6d45b67c411e06c3d137a83` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/sun/quincunx/neptune` | `c1ee0e83ab9c879c4ca7a46a418b472b4bcddaca20cad790ddf7a95246cfb952` | `bfe8c8d7f4b7f70ad9f15823ad1bdb8d3e56e818987f92a5cecafe4e3c4f7255` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/sun/quincunx/north-node` | `97d7a8eb935f3d304a85516a57c32a10a6bb49636bc1624b8722221267ffc364` | `98850ca969f9c0227f0a5cfae8c9aa8eea939e3c7169555933787a95510ff18f` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/sun/quincunx/part-of-fortune` | `ecb8f1df60e2f79732d8cd4b9154ac37d2a78ef484a44673d8ac7575521e9513` | `c17b3e025eded3fdbb6cf8c18eb264220821f8a87193a3e75895824c4d2b4c47` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/sun/quincunx/south-node` | `20acf5266bc67485c23eab6538138e3956ea7d29ecd920ded0c60f9ba53a4975` | `0e27ddadba07396c64d3da90618ac09e4a320804ec5991b0a1e2d46e54253382` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/sun/sextile/neptune` | `fca25b908b12d9be1d713dc54fe014e46354b23e0da9f05130c28711b5ef169f` | `d856a1edddaa84d58b467c9c7778cbc4a8a2f1da979c5f53b74bf7ad8eb5d63f` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/sun/square/moon` | `542407ae039e3cdd13833c665552147211434b5bfcc22eb8bece46efeaa18d47` | `791ac7ddc084bb1d70ea8f951b65af3a8b9149f41840ea251557fc994f9bce72` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/uranus/quincunx/midheaven` | `285a26e01644b203aecedbdecc37888e571ae42e9accf99fb2d8489f99b44ee9` | `d08851b7e8fb1e0e578fa7846688396f64c76e262545a7c6064f1f4209b0ed62` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/uranus/quincunx/neptune` | `d15ac76773f870e4366ac0001d421777a358f848bf8ddf5ade01b127f72ec59e` | `d0fd7efac28589f29f267b44762a11f280bcb874e1d25768e8c13ee12cb1ed30` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/uranus/quincunx/north-node` | `fc8f605031fd205638cc93c790a4d65a3e7f698a89e04610264f36aa82933283` | `de6f0f18b59578f0868ef4536af64633d94408258eb56f01056605df6c05b669` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/uranus/quincunx/pluto` | `ad4da6a48d184a40379e9618e377dc83c82b0a1425e9f502bb8271e4b3895240` | `47b4c8734087de0cb951767ad3f87caa06f933a95e0c2cb9f54ab4cc1f58452e` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/uranus/quincunx/south-node` | `54b1fd4448b080205027bca8fceca18d59f524e829ae9b3406bd23716d6ffbde` | `b654b4b7b7764e84d073e998235058fefdfc0e5bd19032114157e0e4f46ebec2` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/uranus/sextile/neptune` | `fa86836cc1ee888c222a59c3e5a27f75935a6be50e7c058ee3a4ec0d1a70c7bf` | `0714ca5b92f0f0809755237c6b89b68161b2bb2b71208d3e824b5dbf6c231db6` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/uranus/sextile/part-of-fortune` | `fd5f406eab21548a14394fbb02f5ff5c82762aa755e39b8c14bbccba6e5e09bc` | `d912a0ec91907f1e023dfcdc06d3be95036fdc7ff1ecd069240e1834da45249d` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/uranus/sextile/south-node` | `35d5b44eff91d24749dabb903a8947daf9b0947599b9f0395dddf85adf12a1e0` | `944e04ca7c27eadcccec88e3d86b96d6ae89d8d7520f52fc5543f6c99408fe29` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/uranus/square/pluto` | `ffcaacd4fbd2c930a1e3b52060ef81bb7d7480fb28f15eb1886bb65c3a8a527f` | `d3a0259fc67b6eab481ef38c48c9c5e974672eba6a95f56100b7c66a2f4b3944` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/venus/quincunx/jupiter` | `66d2306b6f4d8f0d718b6e05e8b2684f91f4dc0cdfa0a07bf3290fd1217d1f0b` | `9274e9d29b19070c144482f37852952d8ffbf20270110f2d18d8022df17470b7` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/venus/quincunx/neptune` | `37d7353e9ad63a2d4ac778112381f7929466995bb3b8d0e2b07eed8f7373f909` | `34b2f906a2de78174544b1bf4599789d7485082703d1d254beb3225e2e076a61` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/venus/quincunx/north-node` | `50e7362de9cece561582f34a23f6a98422c2d9af2f2731a70cabe93813d42e0d` | `94317643fcec23b0f057cb02ef00a9ec1b2d6e20e350551d8bb4a921dea7fff7` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/venus/quincunx/saturn` | `1221cac60c22c48409108208710e155f1a843d3edd59aafbd081d788847022f0` | `26c94a3816835c172e170029092d31314119ce0077b16c4dcea2b7c391467749` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/venus/quincunx/south-node` | `a79f53ca4b03d5c8c7beac1fd33dddb53fd65dadbc5bbd1fbc852d23ce361505` | `8bfc77fc36db8ec224a07d5a8746d707ccb6b097084a08b437ec972c69863b87` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/venus/quincunx/uranus` | `c86d5943c8d00951dbcd3f080e8270d25a0d526dff9b321e744b9ae463b42144` | `e057d87b85fa0816f524a8e3a5e9f15e3dff3b42cd45b388c245db6a2c3a2e66` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/venus/sextile/part-of-fortune` | `ffdad76356e8a41d5a457eeb81c354d69f0cd29a38f0d5c942255c0301a9e376` | `3bebe925dd2ca77892d73a5300859c2989ce489f60c10ff03200619a8f68bec8` | copy identical; V13 metadata retained |
| `fallback-hook/natal-aspect-lived/venus/sextile/pluto` | `7f8749bd2d3f4316d91728895312f5042b11f861814ec07c3c3e612ecfd63c65` | `970215b38697fcb38750069d737e6f7d9e0c70cd5ef1824de574adc55b1aafb7` | copy identical; V13 metadata retained |
| `fallback-hook/placement-house-lived/moon/6` | `0f725fa01a0ab00f302dbb9666fc814616898e87d831ad18a4999bf9dcec50ec` | `c6ec818c3a69525d67b9b94da7db06f1cc0174e681e53ad18e2e52b0ec095cb7` | copy identical; V13 metadata retained |
| `fallback-hook/placement-house-lived/north-node/10` | `71b593d99ab76e1b163bb6a5b0c3b39bf16f26990d501db776f56f9f21324acb` | `0871744890b4cf404dc360ddb9755c9a78b9594f63fe0bce7093112261a3967d` | copy identical; V13 metadata retained |
| `fallback-hook/placement-house-lived/part-of-fortune/10` | `3f6942995c54f43ac28919691d612200a5e8e235546efb1077c05cc286fed6f6` | `745aabf8e0a1cab68bc79ebf92c76290e9bd92d27905cad3c09de02ddeca787e` | copy identical; V13 metadata retained |
| `fallback-hook/placement-house-lived/part-of-fortune/5` | `241151c23006ac123525a7a623499e13bee5b343420b892ab82d2351cdbac2f8` | `b48dad5a74a89af3e1b6aab60e3a559fe953c5c205ab7d65d624acee784160a1` | copy identical; V13 metadata retained |
| `fallback-hook/placement-house-lived/part-of-fortune/6` | `402b1d5c73c7b80991c119ff0912e46e3573fb8715a7c2a583bca690550c59bb` | `2dca7452b57ac73ca81ccf4ebd5c6eb10af2798c6ca8c807e23a57a6a5653eeb` | copy identical; V13 metadata retained |
| `fallback-hook/placement-house-lived/part-of-fortune/7` | `33133cfb87112911f5856995c5e60e06a590cd8a5088b6ac417d526d3168c565` | `d1ad5e62ef3bca1764ef5dd43b9615bacdfee6a7edb6a27b5b8d0155ae58f1af` | copy identical; V13 metadata retained |
| `fallback-hook/placement-house-lived/part-of-fortune/8` | `c390e8c1119af51c4d0582ac3ba9c803ccf06e80154597ecd97d4bafb9e00a35` | `0f11eaded72ac2aa9c39a4951e36211f4912e22ae8e23b650b48aa6079d7a3cc` | copy identical; V13 metadata retained |
| `fallback-hook/placement-house-lived/uranus/10` | `a533f77fc91d29c02ac7d4d53c885fe854f7b0802044fd1b9ff5772a5b4ba99d` | `25ea74eeed802b0c21676b8b725faf49755d73dafb8a4afa6c9b671082f0ce37` | copy identical; V13 metadata retained |
| `fallback-hook/placement-sign-lived/mars/cancer` | `6a70e8bd0e8123471cd85390093ca9edf40f033aace79ac4d8ed98433bb77ef2` | `b1282f0a292616d401365f6fdb802b1e773b8d1168a4e27131a0daacfacbf653` | owner-ruled V13 copy |
| `fallback-hook/placement-sign-lived/mercury/aries` | `0237fd88c302885a82be4afc5d3bdd2a9fa17712edf983a4aa37202e50c64de9` | `eeaf9892efae00278fbb15244b646b47e2a69bf1a7e7ccc910faff71be442cbd` | copy identical; V13 metadata retained |
| `fallback-hook/planet-lived/jupiter` | `a02988cabd5b2561a5d02eb6ec4934fbf956123afee1f3f30f5a32af09055174` | `65c93b8e8c3175e8fbb6c777bb058c528056e95f1ce9b71d3f9e865b9f3e9fae` | copy identical; V13 metadata retained |

## Generated artifacts

Generated fallback manifests, `dist/tldr-content.js`, and `content-book.html` are regenerated from the repaired source. They are never merged across branches.
