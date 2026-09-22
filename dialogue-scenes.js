/* ============================================================
   日常场景对话库（Dialogue Scenes）
   用于「情景对话口语」模块：一问一答，随机出题，答不上来有多档提示。

   每条结构：
     q    对方说的那句话（你听到的）
     qCn  对方的中文意思
     a    你可以怎么答（第一个是最推荐的说法，其余同样算对）
     aCn  回答的中文
     tip  💡 这句话在什么场合说、起什么作用（不讲语法）
     alt  对方换一种说法时，你大概率会听到的同义问法（用于「换一问法」提示）

   设计原则（借鉴 byoungd/up 的口语篇）：
     不背整段，只练「听到这句 → 我该怎么接」的反应；
     tip 只讲社交功能，让人知道什么时候说、说了起什么作用。
   ============================================================ */
window.DIALOGUE_SCENES = {
  version: 1,
  scenes: [
    {
      id: 'restaurant', name: '餐厅点餐', icon: '🍽️', items: [
        { q: "Hi, welcome. Table for two?", qCn: "欢迎光临，两位吗？", a: ["Yes, table for two, please.", "Two, please. Could we sit by the window?"], aCn: "是的，两位。／两位，能坐窗边吗？", tip: "进店第一句通常是确认人数；想指定位置就说 by the window / in the corner。" },
        { q: "Are you ready to order?", qCn: "可以点餐了吗？", a: ["Yes, I'll have the grilled salmon.", "Could we have a few more minutes, please?"], aCn: "我要烤三文鱼。／请再给我们几分钟。", tip: "没想好别硬点，Could we have a few more minutes 是争取时间的标准说法。", alt: ["Can I take your order?", "Do you know what you'd like?"] },
        { q: "How would you like your steak?", qCn: "牛排要几分熟？", a: ["Medium, please.", "Medium rare, please."], aCn: "五分熟。／三分熟。", tip: "熟度从生到熟：rare → medium rare → medium → medium well → well done。" },
        { q: "Is everything alright with your meal?", qCn: "菜还合口味吗？", a: ["Yes, everything's great, thanks.", "It's good, but could I get some water?"], aCn: "很好，谢谢。／挺好，能给我点水吗？", tip: "服务员巡台时的确认；有问题用 It's good, but ... 先肯定再提要求，比直接抱怨更自然。" },
        { q: "Would you like anything for dessert?", qCn: "要甜点吗？", a: ["No, just the check, please.", "What do you recommend?"], aCn: "不用，买单。／有什么推荐？", tip: "美国说账单是 check，英国用 bill；just the check 就是「直接结账」。" },
        { q: "Can we pay separately?", qCn: "我们能分开付吗？", a: ["Sure, let's split it.", "No, I'll get this one."], aCn: "好，AA。／不用，这顿我请。", tip: "split the bill = 分摊；I'll get this / It's on me = 我请客。" }
      ]
    },
    {
      id: 'coffee', name: '咖啡饮品', icon: '☕', items: [
        { q: "Hi, what can I get for you?", qCn: "你好，要点什么？", a: ["A medium latte, please.", "Can I get an iced americano?"], aCn: "中杯拿铁。／来杯冰美式。", tip: "点单万能句式：Can I get ... / I'll have ...，比 I want 自然得多。", alt: ["What can I get started for you?", "Hi there, what'll it be?"] },
        { q: "For here or to go?", qCn: "堂食还是外带？", a: ["For here, please.", "To go, please."], aCn: "堂食。／外带。", tip: "美国外带说 to go，英国说 takeaway；点咖啡必被问到的一句。" },
        { q: "Would you like room for cream?", qCn: "要留点空间加奶吗？", a: ["Yes, just a little, please.", "No, black is fine."], aCn: "要一点。／不用，喝黑的就行。", tip: "room for cream 字面是「留点地方给奶油」，不加奶时说 black。" },
        { q: "Do you want it hot or iced?", qCn: "热的还是冰的？", a: ["Iced, please.", "Hot, please."], aCn: "冰的。／热的。" },
        { q: "Anything else?", qCn: "还要别的吗？", a: ["That's it, thanks.", "And a blueberry muffin, please."], aCn: "就这些，谢谢。／再来个蓝莓玛芬。", tip: "That's it / That's all 表示「就这些」，收尾常用。" }
      ]
    },
    {
      id: 'shopping', name: '购物消费', icon: '🛍️', items: [
        { q: "Hi, can I help you find anything?", qCn: "需要我帮您找什么吗？", a: ["No thanks, I'm just browsing.", "Yes, I'm looking for a blue sweater."], aCn: "不用，我随便看看。／我在找蓝色毛衣。", tip: "just browsing = 我只是逛逛，是拒绝店员跟随又不失礼貌的标准回答。", alt: ["Are you finding everything okay?", "Need a hand with anything?"] },
        { q: "What size are you?", qCn: "您穿什么尺码？", a: ["I'm a medium.", "I wear a size 10."], aCn: "中号。／我穿 10 码。" },
        { q: "Would you like to try it on?", qCn: "要试穿吗？", a: ["Yes, where's the fitting room?", "No, I'll just take it."], aCn: "要，试衣间在哪？／不用，直接拿这件。", tip: "fitting room / dressing room 都是试衣间。" },
        { q: "That'll be $45. Cash or card?", qCn: "一共 45 美元，现金还是刷卡？", a: ["Card, please.", "Can I pay with my phone?"], aCn: "刷卡。／能手机支付吗？", tip: "刷卡说 card，手机支付说 pay with my phone / tap。" },
        { q: "Would you like the receipt?", qCn: "需要小票吗？", a: ["Yes, please.", "No, that's okay."], aCn: "要。／不用了。" },
        { q: "Do you need a bag?", qCn: "需要袋子吗？", a: ["Yes, please.", "No, I can carry it."], aCn: "要。／不用，我拿得下。" }
      ]
    },
    {
      id: 'service', name: '售后与投诉', icon: '🛠️', items: [
        { q: "Hi, how can I help you?", qCn: "您好，有什么可以帮您？", a: ["I'd like to return this, please.", "There's a problem with my order."], aCn: "我想退货。／我的订单有问题。", tip: "开口先说目的：I'd like to ... 比 I want to 得体。", alt: ["What can I do for you?", "How may I help you?"] },
        { q: "Do you have the receipt?", qCn: "有收据吗？", a: ["Yes, here it is.", "I'm afraid I lost it."], aCn: "有，在这儿。／恐怕我弄丢了。", tip: "I'm afraid ... 用来铺垫坏消息，比直接说 I lost it 缓和。" },
        { q: "Would you like a refund or an exchange?", qCn: "要退款还是换货？", a: ["A refund, please.", "I'd rather exchange it."], aCn: "退款。／我更想换一个。", tip: "I'd rather ... = 我更想要（另一个选项）。" },
        { q: "I'm sorry for the delay. We're working on it.", qCn: "抱歉耽误了，正在处理。", a: ["I understand, but how long will it take?", "That's fine, thanks for letting me know."], aCn: "我理解，但要多久？／没关系，谢谢告知。", tip: "先 I understand 再追问，既给对方面子又把问题问清楚。" },
        { q: "Is there anything else I can do for you?", qCn: "还有其他需要吗？", a: ["No, that's all, thank you.", "Actually, one more thing ..."], aCn: "没了，谢谢。／其实还有一件事……", tip: "Actually 用来追加话题，比 and 更自然。" }
      ]
    },
    {
      id: 'hotel', name: '酒店住宿', icon: '🏨', items: [
        { q: "Good evening. Do you have a reservation?", qCn: "晚上好，有预订吗？", a: ["Yes, it's under Wang.", "No, do you have any rooms tonight?"], aCn: "有，姓王。／没有，今晚还有房吗？", tip: "under + 姓氏 = 以谁的名字订的，入住必用。" },
        { q: "May I see your ID and credit card, please?", qCn: "可以出示证件和信用卡吗？", a: ["Sure, here you go.", "Of course — do you need both?"], aCn: "当然，给你。／当然，两个都要吗？" },
        { q: "Your room is on the 8th floor. Need help with your luggage?", qCn: "房间在 8 楼，需要帮忙拿行李吗？", a: ["No thank you, I can manage.", "Yes, please. That'd be great."], aCn: "不用，我自己来。／好啊，谢谢。", tip: "I can manage = 我自己能行，婉拒帮助的常用语。" },
        { q: "Would you like a wake-up call?", qCn: "需要叫醒服务吗？", a: ["Yes, at 6:30, please.", "No thanks, I'll use my alarm."], aCn: "要，六点半。／不用，我用闹钟。" },
        { q: "Checking out today? How was your stay?", qCn: "今天退房吗？住得怎么样？", a: ["It was great, thank you.", "Fine, but the shower didn't drain well."], aCn: "很好，谢谢。／还行，但淋浴下水不畅。", tip: "提问题用 Fine, but ... 先肯定再具体说，工作人员更容易立刻处理。" }
      ]
    },
    {
      id: 'transport', name: '打车与公交', icon: '🚕', items: [
        { q: "Where to?", qCn: "去哪儿？", a: ["To the airport, please.", "46 Linden Street, please."], aCn: "去机场。／林登大街 46 号。", tip: "上车直接报目的地 + please，简洁自然。", alt: ["Where are you headed?", "What's your destination?"] },
        { q: "Do you want me to take the highway?", qCn: "走高速吗？", a: ["Yes, whichever is faster.", "No, let's avoid the toll."], aCn: "走吧，哪个快走哪个。／别走，躲开过路费。", tip: "whichever is faster = 哪个快就哪个，把决定权交回司机。" },
        { q: "Excuse me, does this bus go downtown?", qCn: "请问这车去市中心吗？", a: ["Yes, it does.", "No, you want the number 7, across the street."], aCn: "去。／不去，坐对面那趟 7 路。" },
        { q: "Is this seat taken?", qCn: "这个座位有人吗？", a: ["No, go ahead.", "Yes, sorry — someone's sitting there."], aCn: "没人，坐吧。／有人，抱歉。" },
        { q: "We're here. That'll be $18.", qCn: "到了，18 美元。", a: ["Here's twenty, keep the change.", "Can I pay by card?"], aCn: "给你 20，不用找。／能刷卡吗？", tip: "keep the change = 不用找零，是给小费的常用说法。" }
      ]
    },
    {
      id: 'airport', name: '机场出行', icon: '✈️', items: [
        { q: "May I see your passport and boarding pass?", qCn: "请出示护照和登机牌。", a: ["Sure, here you go.", "Of course — one moment."], aCn: "好的，给你。／当然，稍等。" },
        { q: "Do you have any bags to check in?", qCn: "有行李要托运吗？", a: ["Just one suitcase.", "No, carry-on only."], aCn: "就一个箱子。／没有，只带登机箱。" },
        { q: "Would you prefer a window or an aisle seat?", qCn: "想要靠窗还是靠过道？", a: ["Aisle, please.", "Window, if possible."], aCn: "靠过道。／靠窗，如果有。" },
        { q: "What's the purpose of your visit?", qCn: "此行目的是什么？", a: ["I'm here on business.", "I'm visiting family."], aCn: "出差。／探亲。", tip: "入境问答要短、要具体：on business / visiting family / on vacation / attending a conference。" },
        { q: "Is this your first time in the States?", qCn: "第一次来美国吗？", a: ["Yes, I'm here on vacation.", "No, I came here two years ago."], aCn: "是的，来度假。／不是，两年前来过。" }
      ]
    },
    {
      id: 'health', name: '看病就医', icon: '🏥', items: [
        { q: "What seems to be the problem?", qCn: "哪里不舒服？", a: ["I've had a sore throat since Monday.", "I have a fever and a headache."], aCn: "周一以来喉咙痛。／发烧加头痛。", tip: "说症状用 I've had ... since + 时间点，医生马上知道病程。", alt: ["What brings you in today?", "How can I help you?"] },
        { q: "How long have you been feeling this way?", qCn: "这样多久了？", a: ["About three days.", "Since last night."], aCn: "大概三天。／昨晚开始。" },
        { q: "Are you allergic to any medication?", qCn: "有药物过敏吗？", a: ["No, none that I know of.", "Yes, I'm allergic to penicillin."], aCn: "没有，据我所知。／有，青霉素过敏。", tip: "none that I know of = 据我所知没有，比直接说 No 更稳妥。" },
        { q: "Have you taken anything for it?", qCn: "吃过什么药吗？", a: ["Just some over-the-counter painkillers.", "No, not yet."], aCn: "只吃了点非处方止痛药。／还没吃。" },
        { q: "Any questions before you go?", qCn: "走之前还有问题吗？", a: ["Should I stay home from work?", "How long before I feel better?"], aCn: "我需要在家休息吗？／多久能好？" },
        { q: "Do you have insurance?", qCn: "有保险吗？", a: ["Yes, here's my card.", "No, I'll pay out of pocket."], aCn: "有，这是我的卡。／没有，我自费。", tip: "out of pocket = 自掏腰包，即自费。" }
      ]
    },
    {
      id: 'money', name: '银行与支付', icon: '💳', items: [
        { q: "How would you like to pay?", qCn: "您想怎么付款？", a: ["By card, please.", "Can I split it between two cards?"], aCn: "刷卡。／能两张卡分开付吗？", alt: ["Cash or card?", "How are you paying today?"] },
        { q: "Would you like cash back?", qCn: "需要返现吗？", a: ["Yes, twenty dollars, please.", "No, that's fine."], aCn: "要 20 美元。／不用了。" },
        { q: "Your card was declined. Do you have another one?", qCn: "卡被拒了，还有别的卡吗？", a: ["Let me try a different card.", "Really? Let me check my balance."], aCn: "我换张卡试试。／真的吗？我查下余额。" },
        { q: "What can I do for you today?", qCn: "今天办什么业务？", a: ["I'd like to open a savings account.", "I need to exchange some currency."], aCn: "我想开个储蓄账户。／我需要换点外币。" },
        { q: "Do you have your ID with you?", qCn: "带身份证了吗？", a: ["Yes, here's my passport.", "I'm afraid I left it at home."], aCn: "带了，这是护照。／恐怕落家里了。" }
      ]
    },
    {
      id: 'directions', name: '问路指路', icon: '🧭', items: [
        { q: "Excuse me, how do I get to the museum?", qCn: "请问博物馆怎么走？", a: ["Go straight for two blocks, then turn left.", "It's about a ten-minute walk that way."], aCn: "直走两个路口再左转。／往那边走大概十分钟。", tip: "指路三件套：go straight / turn left(right) / it's on your left；用 block 而不是「米」更符合美国习惯。", alt: ["Could you tell me how to get to the station?", "Which way to the museum?"] },
        { q: "Is it far from here?", qCn: "离这儿远吗？", a: ["No, just a couple of blocks.", "Kind of — you'd better take a bus."], aCn: "不远，就两个路口。／有点远，最好坐公交。" },
        { q: "Am I going the right way for the station?", qCn: "去车站是这么走吗？", a: ["Yes, keep going straight.", "No, you're going the wrong way."], aCn: "对，一直走。／不对，方向反了。" },
        { q: "Could you show me on the map?", qCn: "能在地图上指给我看吗？", a: ["Sure — we're right here.", "Of course, it's just around the corner."], aCn: "当然，我们在这儿。／当然，就在拐角处。" },
        { q: "Is there a restroom nearby?", qCn: "附近有洗手间吗？", a: ["Yes, there's one in the mall.", "Sorry, I'm not from around here."], aCn: "有，商场里有。／抱歉，我不是本地人。", tip: "不知道就说 I'm not from around here，比沉默或乱指好。" }
      ]
    },
    {
      id: 'work', name: '职场沟通', icon: '💼', items: [
        { q: "Do you have a minute to go over the numbers?", qCn: "有空过一下数据吗？", a: ["Sure, give me five minutes.", "Can we do it after lunch?"], aCn: "有，给我五分钟。／午饭后行吗？", tip: "Do you have a minute 是「打扰一下」的礼貌开场，不是真的只要一分钟。", alt: ["Got a second?", "Can I borrow you for a minute?"] },
        { q: "How's the project coming along?", qCn: "项目进展如何？", a: ["On track — I'll send the draft tomorrow.", "A bit behind, but I'll catch up."], aCn: "按计划，明天发初稿。／有点落后，但我会赶上。", tip: "进度汇报固定说法：on track（正常）/ behind schedule（落后）/ ahead of schedule（超前）。" },
        { q: "Can you send me the report by Friday?", qCn: "周五前能发我报告吗？", a: ["Sure, no problem.", "I'm afraid Friday's tight — how about Monday?"], aCn: "没问题。／周五恐怕太紧，周一可以吗？", tip: "拒绝时给替代方案（how about ...），比只说做不到专业得多。" },
        { q: "What do you think about this plan?", qCn: "你觉得这个方案怎么样？", a: ["I like it, but we might need more budget.", "Honestly, I see a few risks."], aCn: "挺好，但可能需要更多预算。／说实话我看到几个风险。", tip: "先肯定再提顾虑：I like it, but ... 是最安全的表达方式。" },
        { q: "Sorry, I didn't catch that. Could you say that again?", qCn: "抱歉没听清，能再说一遍吗？", a: ["Sure, let me repeat that.", "Of course — I'll slow down."], aCn: "当然，我再说一遍。／好的，我说慢点。" },
        { q: "Thanks for staying late tonight.", qCn: "谢谢你今晚加班。", a: ["No problem, happy to help.", "It's all part of the job."], aCn: "没事，乐意帮忙。／分内的事。" }
      ]
    },
    {
      id: 'interview', name: '求职面试', icon: '🧑‍💼', items: [
        { q: "Tell me a little about yourself.", qCn: "简单介绍一下你自己。", a: ["Sure — I'm a sales rep, and I've been in the industry five years.", "I've spent the last three years leading a small team."], aCn: "我是销售，入行五年。／过去三年带一个小团队。", tip: "这不是让你讲人生故事，而是「现在在做什么 + 相关经历」，30 秒内讲完。" },
        { q: "Why do you want to work here?", qCn: "为什么想来我们公司？", a: ["I've always admired your products, and the role fits my background.", "I'm looking for a place to grow, and this feels right."], aCn: "一直很认可贵司产品，岗位也契合我的背景。／我想找个能成长的地方，这里很合适。" },
        { q: "What's your greatest strength?", qCn: "你最大的优点是什么？", a: ["I stay calm under pressure.", "I'm good at breaking big problems into small steps."], aCn: "压力下能保持冷静。／我擅长把大问题拆成小步骤。", tip: "说优点要配一个具体行为，别只说 hardworking 这种空词。" },
        { q: "Where do you see yourself in five years?", qCn: "五年后你想做到什么位置？", a: ["Ideally, leading a team and mentoring new people.", "I'd like to grow into a senior role here."], aCn: "希望带团队、带新人。／希望在这里成长为资深角色。" },
        { q: "Do you have any questions for us?", qCn: "你有什么想问我们的吗？", a: ["Yes — what does a typical day look like?", "What does success look like in this role?"], aCn: "有的，一天通常怎么安排？／这个岗位怎样算做得好？", tip: "一定要问，问法和内容本身就在展示你的思路。" }
      ]
    },
    {
      id: 'phone', name: '电话沟通', icon: '📞', items: [
        { q: "Hello, is David there?", qCn: "你好，David 在吗？", a: ["Speaking.", "Sorry, he's not in. Can I take a message?"], aCn: "我就是。／抱歉他不在，要留言吗？", tip: "对方要找的人正是你，就说 Speaking（= 我就是），不用 Yes, I am。", alt: ["Is David available?", "May I speak to David?"] },
        { q: "Could I speak to Mr. Chen, please?", qCn: "请问陈先生在吗？", a: ["One moment, I'll put you through.", "I'm afraid he's in a meeting."], aCn: "稍等，我给您转接。／恐怕他在开会。" },
        { q: "Can I leave a message?", qCn: "我能留个言吗？", a: ["Of course, go ahead.", "Sure — could I have your number?"], aCn: "当然，请说。／可以，留个电话？" },
        { q: "Sorry, I'm losing you. Can you hear me?", qCn: "信号不太好，能听见吗？", a: ["Yes, I can hear you now.", "You're breaking up — let me call you back."], aCn: "现在能听见。／你声音断断续续，我打回去。", tip: "You're breaking up = 你那边断了，是信号差时的标准说法。" },
        { q: "Thanks for calling. Anything else?", qCn: "感谢来电，还有别的事吗？", a: ["No, that's all. Thanks for your help.", "Actually, one more thing ..."], aCn: "没了，谢谢帮忙。／其实还有一件事。" }
      ]
    },
    {
      id: 'social', name: '社交寒暄', icon: '👋', items: [
        { q: "Hey, how's it going?", qCn: "嘿，最近怎么样？", a: ["Pretty good, thanks. How about you?", "Can't complain. Busy as usual."], aCn: "挺好的，你呢？／还行，照样忙。", tip: "How's it going 是打招呼不是真的提问，简短回答 + 反问即可。", alt: ["How are you doing?", "What's up?", "How's everything?"] },
        { q: "Have we met before?", qCn: "我们之前见过吗？", a: ["I don't think so — I'm Lin.", "Yes, I think we met at Anna's party."], aCn: "应该没有，我叫林。／见过，在 Anna 的派对上。" },
        { q: "What do you do?", qCn: "你是做什么的？", a: ["I'm a software engineer.", "I work in marketing."], aCn: "我是软件工程师。／我做市场。" },
        { q: "We should grab lunch sometime.", qCn: "改天一起吃个午饭。", a: ["Sure, I'd love to.", "Sounds good — how about Thursday?"], aCn: "好啊。／好啊，周四？", tip: "grab lunch / grab a coffee 表示随便吃（喝）点，比 have lunch 轻松。" },
        { q: "This is my friend Anna.", qCn: "这是我朋友 Anna。", a: ["Nice to meet you, Anna.", "Hi Anna — I've heard a lot about you."], aCn: "很高兴认识你。／嗨，久仰大名。" },
        { q: "I should get going.", qCn: "我该走了。", a: ["Already? Let's do this again soon.", "Take care — talk soon."], aCn: "这么早？下次再聚。／保重，回头聊。", tip: "I should get going 是礼貌退场信号，主人通常会再挽留一句。" }
      ]
    },
    {
      id: 'daily', name: '日常闲聊', icon: '💬', items: [
        { q: "Crazy weather we're having, huh?", qCn: "这天气也太怪了吧？", a: ["I know — it was sunny an hour ago.", "Tell me about it. I didn't bring a coat."], aCn: "是啊，一小时前还晴着。／可不是嘛，我都没带外套。", tip: "Tell me about it = 可不是嘛（附和），不是让对方真的讲给你听。" },
        { q: "How was your weekend?", qCn: "周末过得怎么样？", a: ["Pretty relaxing — I finally cleaned my apartment.", "Busy but good. We went hiking."], aCn: "挺放松，终于打扫了房间。／忙但不错，去徒步了。" },
        { q: "Any plans for the holiday?", qCn: "假期有什么安排？", a: ["Not much, just staying home.", "We're thinking about a short trip."], aCn: "没什么，就在家。／在考虑短途旅行。" },
        { q: "Did you catch the game last night?", qCn: "昨晚比赛看了吗？", a: ["Yeah, what a finish!", "No, I missed it — who won?"], aCn: "看了，结尾太精彩了！／没看，谁赢了？" },
        { q: "Long time no see!", qCn: "好久不见！", a: ["I know, it's been ages. How have you been?", "Too long! What have you been up to?"], aCn: "是啊，好久了，你最近好吗？／太久没见，最近在忙什么？" }
      ]
    },
    {
      id: 'family', name: '家人日常', icon: '👨‍👩‍👧', items: [
        { q: "How was school today?", qCn: "今天在学校怎么样？", a: ["It was fine. We had a math test.", "Same as always."], aCn: "还不错，有数学考试。／老样子。" },
        { q: "Can you help me with the dishes?", qCn: "能帮我洗下碗吗？", a: ["Sure, I'll dry.", "In a minute — I'm almost done."], aCn: "好，我来擦干。／等一下，我快好了。" },
        { q: "What do you want for dinner?", qCn: "晚饭想吃什么？", a: ["Whatever you feel like.", "Something light — I'm not that hungry."], aCn: "你说了算。／清淡点，我不太饿。", tip: "Whatever you feel like = 随便，你定；比 I don't care 听着友善。" },
        { q: "Did you take out the trash?", qCn: "垃圾倒了吗？", a: ["Yes, already did.", "Oh, I forgot — I'll do it now."], aCn: "倒了。／啊忘了，现在去。" },
        { q: "Can I stay over at Mark's tonight?", qCn: "今晚能住 Mark 家吗？", a: ["Sure, but be home by ten.", "Not on a school night."], aCn: "可以，但十点前回来。／上学日不行。" }
      ]
    },
    {
      id: 'housing', name: '租房住房', icon: '🏠', items: [
        { q: "So, what do you think of the place?", qCn: "你觉得这房子怎么样？", a: ["I like it. Is parking included?", "It's nice, but a bit small for the price."], aCn: "挺喜欢，停车包吗？／不错，但这个价格有点小。", tip: "表达保留意见用 It's nice, but ...，便于后面谈价。" },
        { q: "The rent is $1,200 a month, utilities included.", qCn: "月租 1200，含水电网。", a: ["Does that include parking?", "Is the deposit refundable?"], aCn: "含车位吗？／押金退吗？" },
        { q: "When would you like to move in?", qCn: "想什么时候搬进来？", a: ["Next weekend, if possible.", "The first of the month."], aCn: "下周末，如果可以。／月初。" },
        { q: "The landlord says he can come by on Thursday.", qCn: "房东说周四能过来。", a: ["That works for me.", "Could he come earlier? I work in the afternoon."], aCn: "我可以。／能早点吗？我下午要上班。", tip: "确认时间用 That works for me（这个时间我ok）。" },
        { q: "Who's responsible for repairs?", qCn: "维修归谁负责？", a: ["The landlord, according to the lease.", "Usually the tenant for small things."], aCn: "按合同是房东。／小东西一般租客自己弄。" }
      ]
    },
    {
      id: 'delivery', name: '快递外卖', icon: '📦', items: [
        { q: "Your order is here. Leave it at the door?", qCn: "外卖到了，放门口吗？", a: ["Yes, just leave it there, thanks.", "Could you hand it to me, please?"], aCn: "放在那儿就行，谢谢。／能递给我吗？" },
        { q: "I have a package for you. Can you sign here?", qCn: "有你的快递，能在这儿签字吗？", a: ["Sure, where do I sign?", "Can someone else sign for me?"], aCn: "好，签哪儿？／能别人代签吗？" },
        { q: "Your food will be there in about 20 minutes.", qCn: "餐品大约 20 分钟送达。", a: ["Great, thanks.", "That's longer than it said — is it delayed?"], aCn: "好的，谢谢。／比显示的久，是延误了吗？" },
        { q: "Where should I leave the package?", qCn: "包裹放哪儿？", a: ["By the front door, please.", "With the front desk is fine."], aCn: "放前门就行。／放前台也可以。" },
        { q: "Nobody was home when we delivered.", qCn: "派送时没人在家。", a: ["Can you leave it with a neighbor?", "When's the next delivery window?"], aCn: "能放邻居那吗？／下次什么时候送？" }
      ]
    },
    {
      id: 'school', name: '校园学习', icon: '🎓', items: [
        { q: "Did you finish the assignment?", qCn: "作业写完了吗？", a: ["Almost — I just need to proofread it.", "Not yet, I'm still on the last question."], aCn: "快了，还要校对。／还没，还在最后一题。" },
        { q: "Could you explain that last part again?", qCn: "最后那部分能再讲一遍吗？", a: ["Sure, which part was confusing?", "Of course — let's go over it together."], aCn: "当然，哪里不明白？／好，我们一起看。" },
        { q: "Want to study together for the exam?", qCn: "要一起复习备考吗？", a: ["Sure, when are you free?", "I'd love to, but I work tonight."], aCn: "好啊，你什么时候有空？／想去，但今晚要上班。" },
        { q: "How did the test go?", qCn: "考得怎么样？", a: ["Better than I expected.", "Not great, honestly."], aCn: "比预期好。／说实话不太好。" },
        { q: "Can I borrow your notes?", qCn: "能借我笔记吗？", a: ["Sure, I'll send you a copy.", "Sorry, I need them for tonight."], aCn: "好，我发你一份。／抱歉，我今晚要用。" }
      ]
    },
    {
      id: 'feelings', name: '情绪与礼貌', icon: '💗', items: [
        { q: "I'm so sorry I'm late.", qCn: "非常抱歉我迟到了。", a: ["No worries, traffic was bad.", "It's fine — we just got here too."], aCn: "没事，路上堵。／没关系，我们也刚到。", tip: "对方道歉时先接住：No worries / It's fine / Don't worry about it。" },
        { q: "Thanks for helping me out.", qCn: "谢谢你帮我。", a: ["Anytime.", "Don't mention it."], aCn: "随时乐意。／别客气。" },
        { q: "I'm really nervous about the presentation.", qCn: "我对明天的汇报好紧张。", a: ["You'll be great — you know this stuff.", "You've got this. Just start slow."], aCn: "你肯定行，内容你都熟。／你可以的，开始慢点就行。" },
        { q: "I got the job!", qCn: "我拿到那个 offer 了！", a: ["Congratulations! That's amazing news.", "That's awesome — we should celebrate."], aCn: "恭喜！太棒了。／太好了，得庆祝一下。" },
        { q: "I'm having a rough day.", qCn: "我今天过得很糟。", a: ["I'm sorry to hear that. Want to talk?", "That sounds tough. Anything I can do?"], aCn: "真替你难过，想聊聊吗？／听起来不好受，我能做什么吗？" },
        { q: "I didn't mean to upset you.", qCn: "我不是故意让你不高兴。", a: ["It's okay, don't worry about it.", "I appreciate you saying that."], aCn: "没事，别放在心上。／谢谢你这么说。" }
      ]
    },
    {
      id: 'emergency', name: '紧急求助', icon: '🆘', items: [
        { q: "Is everything okay? You look pale.", qCn: "你还好吗？脸色不太好。", a: ["I think I need to sit down.", "I'm okay, just a bit dizzy."], aCn: "我想坐下。／还行，就是有点晕。" },
        { q: "Do you need me to call an ambulance?", qCn: "需要我叫救护车吗？", a: ["Yes, please call 911.", "No, I think I just need some water."], aCn: "要，请打 911。／不用，我喝点水就好。" },
        { q: "Can I help you? You look lost.", qCn: "需要帮忙吗？你看起来迷路了。", a: ["I can't find my wallet — is there a lost and found?", "I think I left my bag in the taxi."], aCn: "我钱包找不到了，有失物招领吗？／我把包落出租车里了。" },
        { q: "Did anyone get hurt?", qCn: "有人受伤吗？", a: ["Everyone's okay, but the car is damaged.", "My friend hurt his arm."], aCn: "人都没事，车撞坏了。／我朋友胳膊受伤了。" }
      ]
    },
    {
      id: 'entertainment', name: '休闲娱乐', icon: '🎬', items: [
        { q: "Wanna catch a movie tonight?", qCn: "今晚看电影吗？", a: ["Sure, what's playing?", "I'd love to, but I'm swamped."], aCn: "好啊，演什么？／想去，但我忙翻了。", tip: "swamped = 忙得不可开交，是拒绝邀约时很自然的理由。" },
        { q: "What do you want to watch?", qCn: "想看什么？", a: ["Something light — I've had a long day.", "You pick, I'm easy."], aCn: "轻松点的，今天很累。／你选，我随便。", tip: "I'm easy / I'm not picky = 我随便，都行。" },
        { q: "Have you seen the new Marvel movie?", qCn: "新的漫威看了吗？", a: ["Yeah, twice.", "No — don't spoil it!"], aCn: "看了，两遍。／没看，别剧透！" },
        { q: "How was the concert?", qCn: "演唱会怎么样？", a: ["Amazing — the crowd was electric.", "Honestly, the sound was terrible."], aCn: "超棒，现场气氛炸了。／说实话音响很差。" }
      ]
    },
    {
      id: 'festival', name: '节日祝福', icon: '🎉', items: [
        { q: "Happy birthday!", qCn: "生日快乐！", a: ["Thank you so much!", "Thanks! I can't believe I'm thirty."], aCn: "太感谢了！／谢啦，不敢相信我三十了。" },
        { q: "Any plans for Thanksgiving?", qCn: "感恩节有安排吗？", a: ["We're going to my parents' place.", "Just a small dinner with friends."], aCn: "去我父母家。／和朋友吃个小饭。" },
        { q: "Merry Christmas!", qCn: "圣诞快乐！", a: ["Merry Christmas! Same to you.", "You too — hope you have a good one."], aCn: "圣诞快乐！你也一样。／你也一样，好好过节。" },
        { q: "Congratulations on the wedding!", qCn: "新婚快乐！", a: ["Thank you, that means a lot.", "Thanks for coming all this way."], aCn: "谢谢，很有意义。／谢谢你大老远赶来。" }
      ]
    },
    {
      id: 'grooming', name: '生活服务', icon: '💇', items: [
        { q: "How would you like your hair cut?", qCn: "头发想怎么剪？", a: ["Just a trim, please.", "A little off the sides."], aCn: "修一下就行。／两边剪短一点。", tip: "trim = 只修一点点；理发店最怕你只说 short，要说明留多长。" },
        { q: "Do you want me to wash it first?", qCn: "要先洗头吗？", a: ["Yes, please.", "No, a dry cut is fine."], aCn: "要。／不用，干剪就行。" },
        { q: "How often do you work out?", qCn: "你多久锻炼一次？", a: ["Three times a week, usually.", "Not as often as I should."], aCn: "一般一周三次。／没那么勤，应该多练练。" },
        { q: "Is this machine free?", qCn: "这台器械有人用吗？", a: ["Yeah, go ahead.", "Sorry, I'm still using it."], aCn: "没人，用吧。／抱歉，我还在用。" },
        { q: "Drop-off or pick-up?", qCn: "送洗还是取件？", a: ["Drop-off — when will it be ready?", "Pick-up, here's my ticket."], aCn: "送洗，什么时候好？／取件，这是单子。" }
      ]
    }
  ]
};
