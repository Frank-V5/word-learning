# -*- coding: utf-8 -*-
"""PET 语法 50 考点 · 规则种子 (权威 ground truth, 非 GLM 生成)
准确性地基: GLM 在这些种子上生成例句/陷阱/题目, 法官按种子验证。"""

SEEDS = [
 # ── 一、时态 (tense, 13) ──
 {"id":"g01","cat":"时态","name":"一般现在时","rule":"表习惯、客观事实或真理","formula":"主语+动词原形(三单加-s/-es)","markers":"always, usually, often, every day"},
 {"id":"g02","cat":"时态","name":"现在进行时","rule":"此时此刻正在进行","formula":"be(am/is/are)+动词-ing","markers":"now, right now, at the moment, Look! Listen!"},
 {"id":"g03","cat":"时态","name":"现在完成时","rule":"过去发生并对现在有影响/结果,或过去到现在的经历","formula":"have/has+过去分词","markers":"already, just, yet, ever, never, for, since"},
 {"id":"g04","cat":"时态","name":"现在完成进行时(拓展)","rule":"过去某时一直持续到现在(强调持续)","formula":"have/has been+动词-ing","markers":"for, since, all morning"},
 {"id":"g05","cat":"时态","name":"一般过去时","rule":"过去某时发生并已结束","formula":"主语+动词过去式","markers":"yesterday, last..., ...ago, in+过去年份"},
 {"id":"g06","cat":"时态","name":"过去进行时","rule":"过去某时刻正在进行的动作","formula":"was/were+动词-ing","markers":"at that time, when, while"},
 {"id":"g07","cat":"时态","name":"过去完成时(拓展)","rule":"过去某时之前已发生(过去的过去)","formula":"had+过去分词","markers":"by the time, before, after"},
 {"id":"g08","cat":"时态","name":"将来时: will","rule":"即时决定、预测或承诺","formula":"will+动词原形","markers":"tomorrow, next..., I think"},
 {"id":"g09","cat":"时态","name":"将来时: be going to","rule":"计划打算,或有迹象的预测","formula":"be going to+动词原形","markers":"tomorrow, next..., 计划/打算"},
 {"id":"g10","cat":"时态","name":"现在进行时表将来","rule":"已安排好的近期将来","formula":"be+动词-ing+将来时间","markers":"tonight, tomorrow, this weekend"},
 {"id":"g11","cat":"时态","name":"used to","rule":"过去常常(现已不如此)","formula":"used to+动词原形","markers":"(过去时间语境)"},
 {"id":"g12","cat":"时态","name":"辨析:现在完成时 vs 一般过去时","rule":"有明确过去时间→一般过去时;强调对现在影响/经历→现在完成时","formula":"现完have/has+pp; 过去did","markers":"现完:already/just/ever/for/since; 过去:yesterday/last/ago"},
 {"id":"g13","cat":"时态","name":"辨析:will vs be going to","rule":"即时决定/客观预测用will;已有计划或有迹象用be going to","formula":"will do / be going to do","markers":"will:即时/预测; going to:计划/迹象"},
 # ── 二、被动语态 (passive, 4) ──
 {"id":"g14","cat":"被动语态","name":"一般时态被动","rule":"动作承受者作主语","formula":"am/is/are done(现在); was/were done(过去)","markers":"(被动标志:被/由)"},
 {"id":"g15","cat":"被动语态","name":"完成/进行时被动","rule":"完成或进行时的被动形式","formula":"has/have been done; is/are being done","markers":""},
 {"id":"g16","cat":"被动语态","name":"情态动词被动","rule":"情态动词的被动","formula":"情态(can/must/should)+be+过去分词","markers":""},
 {"id":"g17","cat":"被动语态","name":"主动↔被动转换","rule":"主动宾语→被动主语;原主语用by引出","formula":"主语+be+过去分词+(by+动作发出者)","markers":"by"},
 # ── 三、条件句与愿望 (conditional, 4) ──
 {"id":"g18","cat":"条件句","name":"零条件句","rule":"普遍真理或习惯","formula":"If+现在时, 主句现在时","markers":""},
 {"id":"g19","cat":"条件句","name":"第一条件句","rule":"将来可能发生的真实情况","formula":"If+现在时, 主句will+动词原形","markers":"if, unless"},
 {"id":"g20","cat":"条件句","name":"第二条件句","rule":"假设或不大可能的情况(虚拟)","formula":"If+过去时, 主句would+动词原形","markers":"if"},
 {"id":"g21","cat":"条件句","name":"wish / If only","rule":"对现在/过去的虚拟愿望","formula":"wish+过去时(现在愿望); wish+过去完成(过去愿望)","markers":"wish, if only"},
 # ── 四、情态动词 (modal, 5) ──
 {"id":"g22","cat":"情态动词","name":"can / could","rule":"能力或请求","formula":"can(现在能力); could(过去能力/委婉请求)","markers":""},
 {"id":"g23","cat":"情态动词","name":"must / have to","rule":"义务与必须;mustn't(禁止)≠don't have to(不必)","formula":"must/have to+动词原形","markers":""},
 {"id":"g24","cat":"情态动词","name":"should / shouldn't","rule":"建议或劝告","formula":"should(+not)+动词原形","markers":""},
 {"id":"g25","cat":"情态动词","name":"may / might","rule":"可能性","formula":"may(可能~50%); might(可能性较小)","markers":""},
 {"id":"g26","cat":"情态动词","name":"情态动词表推测","rule":"对现在的推测","formula":"must be(肯定); can't be(肯定不); might/may be(可能)","markers":""},
 # ── 五、动词用法 (verb, 3) ──
 {"id":"g27","cat":"动词用法","name":"不定式 vs 动名词","rule":"部分动词后接to do(want/decide/hope),部分接doing(enjoy/finish/mind);stop doing停止做/stop to do停下来去做","formula":"verb+to do / verb+doing","markers":""},
 {"id":"g28","cat":"动词用法","name":"使役/感官动词","rule":"使役make/let/have sb do(省to);感官see/hear sb do(全过程)/doing(正在进行)","formula":"make/let/have sb do; see/hear sb do/doing","markers":""},
 {"id":"g29","cat":"动词用法","name":"短语动词","rule":"动词+小品词,整体表义(关联单词平台)","formula":"动词+副词/介词","markers":""},
 # ── 六、从句 (clause, 7) ──
 {"id":"g30","cat":"从句","name":"定语从句:who/which/that","rule":"修饰名词;人用who/that,物用which/that","formula":"名词+who/which/that+从句","markers":""},
 {"id":"g31","cat":"从句","name":"定语从句:whose/where/when","rule":"whose表所属,where表地点,when表时间","formula":"名词+whose/where/when+从句","markers":""},
 {"id":"g32","cat":"从句","name":"转述语:陈述句","rule":"直接语转间接语,时态后移(现→过等),人称与时间词相应变化","formula":"say/tell (that)+时态后移从句","markers":""},
 {"id":"g33","cat":"从句","name":"转述语:疑问句与命令","rule":"疑问句变陈述语序;命令用tell/ask sb (not) to do","formula":"ask if/what+陈述语序; tell sb to do","markers":""},
 {"id":"g34","cat":"从句","name":"时间状语从句","rule":"when/while/as soon as/before/after/until(主将从现)","formula":"连词+从句(现在时表将来)","markers":"when, while, as soon as, until"},
 {"id":"g35","cat":"从句","name":"原因与让步状语从句","rule":"because/since/as表原因;although/even though表让步(不与but连用)","formula":"because/since/although+从句","markers":"because, although, even though"},
 {"id":"g36","cat":"从句","name":"目的与结果状语从句","rule":"so that/in order to表目的;so...that/such...that表结果","formula":"so that+从句; so+adj/adv+that","markers":"so that, so...that"},
 # ── 七、名词/冠词/限定词 (noun, 7) ──
 {"id":"g37","cat":"名词冠词限定","name":"冠词 a/an/the/零冠词","rule":"a/an泛指首次(an用于元音音素);the特指/再次/世上唯一/序数词最高级;三餐球类学科前零冠词","formula":"a/an+单数可数; the+名词","markers":""},
 {"id":"g38","cat":"名词冠词限定","name":"可数 vs 不可数名词","rule":"可数有单复数;不可数无复数(配much/a little);a/an只配可数单数","formula":"","markers":""},
 {"id":"g39","cat":"名词冠词限定","name":"量词:some/any","rule":"some用于肯定句与请求;any用于否定与疑问","formula":"some/any+(复合something/anybody)","markers":"some, any"},
 {"id":"g40","cat":"名词冠词限定","name":"量词:much/many/(a)few/(a)little","rule":"much+不可数,many+可数复数;(a)few+可数,(a)little+不可数;a lot of均可","formula":"","markers":"much, many, few, little"},
 {"id":"g41","cat":"名词冠词限定","name":"物主与反身代词","rule":"my/your后接名词,mine/yours独立;myself/yourself/themselves表反身","formula":"","markers":""},
 {"id":"g42","cat":"名词冠词限定","name":"不定代词","rule":"somebody/anyone/everyone/nobody/everything等,谓语动词用单数","formula":"","markers":""},
 {"id":"g43","cat":"名词冠词限定","name":"名词所有格","rule":"'s用于有生命;of用于无生命","formula":"Tom's / the leg of the table","markers":""},
 # ── 八、形容词/副词/介词/句法 (misc, 7) ──
 {"id":"g44","cat":"形副介词句法","name":"比较级与最高级","rule":"单音节+er/est;多音节more/most;不规则good/better/best;比较级接than,最高级加the","formula":"adj+er+than; the+adj+est","markers":"than, the"},
 {"id":"g45","cat":"形副介词句法","name":"同级比较 as...as","rule":"同级比较用as+原级+as;否定not as/so...as","formula":"as+adj/adv+as","markers":"as...as"},
 {"id":"g46","cat":"形副介词句法","name":"副词(频度/方式/时间)及位置","rule":"频度副词(always/usually)位于be后实义动词前;方式副词在动词后;时间地点副词常在句末","formula":"","markers":"always, usually, often"},
 {"id":"g47","cat":"形副介词句法","name":"介词·时间","rule":"at(时刻),in(月年季),on(某天);since(起点)+for(段);by(截至)+until(直到)","formula":"at/in/on/since/for/by/until","markers":"at, in, on, since, for, by"},
 {"id":"g48","cat":"形副介词句法","name":"介词·地点与方位","rule":"at(点),in(内/大地方),on(面上);into/out of(进出);between(两者)/among(多者)","formula":"","markers":"at, in, on, into, between"},
 {"id":"g49","cat":"形副介词句法","name":"动词+介词搭配","rule":"固定搭配(depend on/interested in/good at/listen to/look for)","formula":"动词/形容词+固定介词","markers":""},
 {"id":"g50","cat":"形副介词句法","name":"连接词/连词","rule":"转折however/although;因果because/so/therefore;顺序first/then/finally","formula":"","markers":"however, although, because, so, finally"},
]
