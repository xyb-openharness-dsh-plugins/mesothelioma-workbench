/* 36 号 · 疾病概要数据（小胸宝 PleuraPal · 恶性胸膜间皮瘤）
 * 只写解释层：定义、文件、指南列出的手段、已经发生的版本与登记事实。
 * 规范：docs/36-DISEASE-PRIMER.md；本项目实例清单：docs/DISEASE-PRIMER.md
 */
/* 36 号 §2.5：以下链接均经 verify-links.mjs 真浏览器验活（OK），不编 URL。 */
const SRC_URL = {
  nhcNotice: 'https://www.nhc.gov.cn/yzygj/c100068/202507/5b3f41180a42465eb9eec34597bacaf2.shtml',
  yisheng: 'https://cmtopdr.com/post/detail/e442849c-d29a-4042-b280-d4c765d84714',
  cma2021: 'https://rs.yiigle.com/cmaid/1317068',
  nccnPatient: 'https://www.nccn.org/patientresources/patient-resources/guidelines-for-patients/guidelines-for-patients-details?patientGuidelineId=19',
  nccnDetail: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1512',
  seerAjcc: 'https://training.seer.cancer.gov/staging/systems/ajcc.html',
  bms: 'https://www.bms.com/cn/media/press-release-listing/08302020.html',
  fda: 'https://www.fda.gov/drugs/resources-information-approved-drugs/fda-approves-pembrolizumab-chemotherapy-unresectable-advanced-or-metastatic-malignant-pleural'
}

window.DISEASE_PRIMER = {
  brand: '小胸宝 PleuraPal',
  name: '恶性胸膜间皮瘤',
  en: 'Malignant Pleural Mesothelioma（MPM）',
  updated: '2026-10-25',
  sections: [
    {
      id: 'definition',
      title: '定义',
      intro: '恶性胸膜间皮瘤是起源于胸膜间皮细胞的恶性肿瘤。卫健委 2025 版指南记载，接触石棉纤维是最主要的致病因素，约 80% 的病例与之相关；'
        + '从石棉暴露到发病的潜伏期约 20～50 年，发病高峰在接触后 45 年。中华医学会 2021 版写暴露后 20～40 年发病、平均约 35～40 年，'
        + '两处表述不一致，本台并排列出，不作裁断。',
      points: [
        '病理分三型：上皮样型、肉瘤样型、双相（混合）型；诊断双相型要求上皮样与肉瘤样成分均大于 10%。',
        '分期参照 AJCC 第 8 版（2017），其来源为 IMIG 2016 提案；本项目按 TNM 与 ⅠA–Ⅳ 期别记录，两套患者语言并存。',
        '确诊常经胸腔积液细胞学或胸膜活检，免疫组化按「至少 2 个间皮瘤标志物 + 2 个肺腺癌标志物」组合排除肺腺癌。',
        '本台只整理胸膜型。腹膜型、心包型、睾丸鞘膜型各有自己的路径，不套用这一套分期与治疗模板：AJCC 第 8 版为胸膜与腹膜各设一套 TNM，两套不互相套用，也不换算。'
      ],
      sources: [
        { org: '国家卫生健康委员会', doc: '恶性胸膜间皮瘤诊疗指南（2025 版）', version: '2025-08', original: false, page: '页码待核', secondaryUrl: SRC_URL.yisheng, note: '壹生转载页，非原始 PDF；官方通知页 ' + SRC_URL.nhcNotice },
        { org: '中华医学会肿瘤学分会', doc: '中国恶性胸膜间皮瘤临床诊疗指南（2021 版）', version: '2021', original: true, page: '页码待核', url: SRC_URL.cma2021 },
        { org: 'AJCC', doc: 'AJCC Cancer Staging Manual', version: '第 8 版（2017）', original: false, page: '页码待核', secondaryUrl: SRC_URL.seerAjcc, note: '手册全文未取得，据 SEER 教学页的分期体系说明' }
      ]
    },
    {
      id: 'evidence',
      title: '医学资料规范和指南情况',
      intro: '一台一表，不合并。未取得原件的只记「存在、大致讲什么」，不引用其具体条文；中文规范与国际指南的口径差异并排列出，本表不做换算。',
      table: {
        head: ['机构', '文件', '版本 / 日期', '原件', '本台的用途'],
        rows: [
          ['国家卫生健康委员会', '恶性胸膜间皮瘤诊疗指南（2025 版）', '2025-08', { text: '未取得原件（壹生转载页）', url: SRC_URL.yisheng }, '一线化疗、双免疫的获批口径、二线清单、手术争议、贝伐的 NMPA 状态'],
          ['中华医学会肿瘤学分会', '中国恶性胸膜间皮瘤临床诊疗指南（2021 版）', '2021', { text: '已取得全文', url: SRC_URL.cma2021 }, '期别分组表、手术界限、后线用药细则、免疫二线研究'],
          ['NCCN', 'NCCN Guidelines for Patients: Pleural Mesothelioma', '2026（基于临床版 V2.2026，2025-10-03）', { text: '已取得（2026 患者版，42 页 PDF）', url: SRC_URL.nccnPatient }, '患者语言的分期解释、治疗选项清单、胸水处理、临床试验说明'],
          ['NCCN', 'NCCN Guidelines: Mesothelioma: Pleural', 'V2.2025（2025-01-14）', { text: '未取得（需注册登录）', url: SRC_URL.nccnDetail }, '仅作版本参照，不引条文与页码'],
          ['AJCC', 'AJCC Cancer Staging Manual', '第 8 版（2017）', { text: '未取得（据 SEER 教学页二次来源）', url: SRC_URL.seerAjcc }, '分期字段口径（本项目经二次来源引用）']
        ]
      },
      points: [
        '卫健委 2025 版是转载页，表格为图片未提取，因此凡引用它的数字都注明「据 2025 版转载页」。',
        '本次检索未见 CSCO 发布间皮瘤专项指南；中文规范以卫健委 2025 版与中华 2021 版为主，不能写「中国指南已更新到某版」。',
        '两套分期语言并存：AJCC/IMIG 的 TNM 与 ⅠA–Ⅳ，以及 Mesothelioma UK 的四期患者版描述。本表不做换算。'
      ],
      sources: [
        { org: '国家卫生健康委员会', doc: '恶性胸膜间皮瘤诊疗指南（2025 版）', version: '2025-08', original: false, page: '页码待核', secondaryUrl: SRC_URL.yisheng, note: '壹生转载页，非原始 PDF' },
        { org: '中华医学会肿瘤学分会', doc: '中国恶性胸膜间皮瘤临床诊疗指南（2021 版）', version: '2021', original: true, page: '页码待核', url: SRC_URL.cma2021 },
        { org: 'NCCN', doc: 'NCCN Guidelines for Patients: Pleural Mesothelioma', version: '2026', original: true, page: '页码待核', url: SRC_URL.nccnPatient }
      ]
    },
    {
      id: 'landscape',
      title: '目前治疗全景概要',
      intro: '只列指南与说明书里出现过的手段类别，按病期与线序分组，不排序、不比优劣。获批适应症的人群限定词逐字保留，是否在你身上成立由医生判断。',
      groups: [
        {
          label: '可切除评估下的局部治疗',
          points: [
            '手术：中华 2021 版写 Ⅰ～ⅢA 期存在手术切除的可能性，ⅢB～Ⅳ 期不推荐手术；NCCN 患者版只对 1 期上皮样提供「手术 + 全身治疗」选项，术式为胸膜剥脱术（P/D）或胸膜外全肺切除（EPP），并建议由有间皮瘤经验的术者执行。',
            '手术证据：MARS 与 MARS2 研究均未显示生存获益，卫健委 2025 版称手术作用「更加具有争议」。这段是文献结论的转述，不是对你是否手术的意见。',
            '放疗：本项目资料未整理间皮瘤的放疗适应证与剂量，本段不展开。'
          ]
        },
        {
          label: '一线全身治疗',
          points: [
            '化疗：培美曲塞联合顺铂；不能耐受顺铂者可用卡铂方案（卫健委 2025 版）。培美曲塞需配合叶酸、维生素 B12 与地塞米松预处理，具体剂量以你所用药物的说明书为准。',
            '化疗加贝伐珠单抗：卫健委 2025 版把贝伐加入铂类双药写入方案，同时写明「贝伐珠单抗尚未被 NMPA 批准用于不可手术 MPM 患者」。',
            '双免疫：纳武利尤单抗联合伊匹木单抗，NMPA 批准用于「不可手术切除的、初治的非上皮样恶性胸膜间皮瘤成人患者」；获批人群限定「非上皮样」，与 CheckMate-743 的全人群证据不是同一范围。',
            '免疫加化疗：帕博利珠单抗联合培美曲塞与铂类，FDA 于 2024-09-17 批准用于不可切除晚期或转移性 MPM 一线；中国 NMPA 状态截至本次检索未核实。'
          ]
        },
        {
          label: '胸水与胸膜局部处理',
          points: [
            '留置胸腔引流管：细软管持续引流，用于反复积液。',
            '滑石粉胸膜固定术：向胸膜腔注入滑石粉，让两层胸膜粘连闭合胸腔、减少积液再聚。',
            '胸腔内化疗：本次检索未见 2021/2025 中文规范与 NCCN 患者版将其列为 MPM 标准治疗；如实际做过，按「实际接受的操作」记录。'
          ]
        },
        {
          label: '复发与后线',
          points: [
            '再挑战：培美曲塞或铂类再次使用（卫健委 2025 版；中华 2021 版补充：一线未用过培美曲塞者二线可用）。',
            '免疫单药：纳武利尤单抗（CONFIRM 研究）。',
            '化疗：吉西他滨 ± 雷莫芦单抗（RAMES 研究）、长春瑞滨（中华 2021 版写「可在无其他方案选择时应用」）。',
            '临床试验：NCCN 患者版把临床试验与标准治疗并列为需要考虑的选项，写明研究用药由申办方承担、安慰剂「almost never used alone」。'
          ]
        }
      ],
      points: [
        '以上是文献与指南里列出的手段，按病期与线序排列，不代表任何一项适合你。选哪一个，这一句需要问你的医生。'
      ],
      sources: [
        { org: '国家卫生健康委员会', doc: '恶性胸膜间皮瘤诊疗指南（2025 版）', version: '2025-08', original: false, page: '页码待核', secondaryUrl: SRC_URL.yisheng, note: '壹生转载页，非原始 PDF' },
        { org: '中华医学会肿瘤学分会', doc: '中国恶性胸膜间皮瘤临床诊疗指南（2021 版）', version: '2021', original: true, page: '页码待核', url: SRC_URL.cma2021 },
        { org: 'NCCN', doc: 'NCCN Guidelines for Patients: Pleural Mesothelioma', version: '2026', original: true, page: '页码待核', url: SRC_URL.nccnPatient },
        { org: '百时美施贵宝中国', doc: '双免疫获 NMPA 批准的新闻稿', version: '落款 2021-06-11', original: false, page: '不适用', secondaryUrl: SRC_URL.bms, note: '批准日期与其他来源存在矛盾，待 NMPA 公示核验' }
      ]
    },
    {
      id: 'trend',
      title: '发展趋势',
      intro: '只写已经发生的事实，每条带日期或版本号。不写展望、预测、推荐与优劣比较。',
      points: [
        '指南版本：NCCN 临床版 V2.2025（2025-01-14）之后，患者版 2026 基于临床版 V2.2026（2025-10-03）发布；本台引用的是患者版 2026，临床版全文未取得。',
        '监管批件：NMPA 批准纳武利尤单抗联合伊匹木单抗用于不可手术切除的、初治的非上皮样 MPM 成人患者，药企新闻稿落款 2021-06-11；另有 2020-08-30 的检索说法，批准日期待 NMPA 公示核验。FDA 于 2024-09-17 批准帕博利珠单抗联合化疗用于不可切除晚期或转移性 MPM 一线，中国 NMPA 状态未核实。',
        '在研登记：2026-10-24 快照，去重后 28 条（CTV 17 条、中国药物临床试验登记与信息公示平台 11 条），登记状态未核实；阶段分布在本次采集中未取得。',
        '分类体系：分期参照 AJCC 第 8 版（2017，源为 IMIG 2016 提案）；病理按卫健委 2025 版的三分型记录，双相型要求两种成分均大于 10%；项目资料未见 WHO 新版分类的记载，是否有更新未核实。',
        '指南结构：2025 版由国家卫健委以罕见病诊疗指南形式印发（2025-08），与中华医学会 2021 版并行；本次检索未见 CSCO 间皮瘤专项指南。'
      ],
      sources: [
        { org: 'NCCN', doc: 'NCCN Guidelines for Patients: Pleural Mesothelioma', version: '2026（基于 V2.2026，2025-10-03）', original: true, page: '页码待核', url: SRC_URL.nccnPatient },
        { org: 'NCCN', doc: 'NCCN Guidelines: Mesothelioma: Pleural', version: 'V2.2025（2025-01-14）', original: false, page: '页码待核', secondaryUrl: SRC_URL.nccnDetail, note: '全文需注册登录，未取得' },
        { org: '百时美施贵宝中国', doc: '双免疫 NMPA 获批新闻稿', version: '2021-06-11', original: false, page: '不适用', secondaryUrl: SRC_URL.bms, note: '批准日期待核验' },
        { org: 'FDA', doc: 'pembrolizumab + chemotherapy 批准公告（KEYNOTE-483）', version: '2024-09-17', original: true, page: '不适用', url: SRC_URL.fda },
        { org: '本项目登记快照', doc: 'research/mesothelioma-cancer/manifest.json（unified-trial-mcp）', version: '2026-10-24', original: true, page: '不适用', nolink: true, note: '自采快照存于本机仓库，无公网 URL；28 条去重，阶段字段未采集' },
        { org: '国家卫生健康委员会', doc: '恶性胸膜间皮瘤诊疗指南（2025 版）', version: '2025-08', original: false, page: '页码待核', secondaryUrl: SRC_URL.yisheng, note: '壹生转载页，非原始 PDF' }
      ]
    }
  ]
}
