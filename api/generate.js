export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 POST 请求' });
  }

  const { product, style, keyword, audience } = req.body;
  if (!product) {
    return res.status(400).json({ error: '请输入产品名称' });
  }

  const styleMap = {
    '种草': '种草推荐（热情分享、强调好用心得）',
    '测评': '真实测评（客观分析、列优缺点、打分）',
    '教程': '使用教程（步骤清晰、手把手教学）',
    '对比': '对比盘点（横向对比、帮读者做选择）',
  };

  const prompt = `你是一个小红书爆款文案写手。请根据以下信息生成一篇小红书风格的文案：

产品：${product}
风格：${styleMap[style] || style}
${keyword ? '关键词：' + keyword : ''}
${audience ? '目标人群：' + audience : ''}

要求：
- 用口语化的中文，像真实用户的分享
- 适当使用emoji
- 末尾加上相关话题标签
- 控制在200字以内
- 不要提到"小红书"这个平台名
- 不要用"亲"这类淘宝客服用语

直接输出文案内容，不要加任何说明。`;

  try {
    const apiKey = process.env.API_KEY;
    const apiBase = process.env.API_BASE || 'https://api.deepseek.com';
    const model = process.env.MODEL || 'deepseek-chat';

    if (!apiKey) {
      return res.json({ content: getFallback(product, style, keyword, audience) });
    }

    const response = await fetch(apiBase + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model, messages: [
          { role: 'system', content: '你是一个专业的小红书文案写手。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8, max_tokens: 600,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || getFallback(product, style, keyword, audience);
    res.json({ content });
  } catch (err) {
    console.error('AI 调用失败:', err.message);
    res.json({ content: getFallback(product, style, keyword, audience) });
  }
}

function getFallback(product, style, keyword, audience) {
  const t = {
    '种草': `✨ 姐妹们！这个${product}真的绝了！\n\n用了一段时间真实感受：\n① 效果太惊艳了\n② 性价比超高\n③ ${keyword || '好用'}的福音\n\n不是广！发自内心推荐给${audience || '大家'}\n\n#好物分享 #${product} #种草`,
    '测评': `📊 ${product}真实测评 | 不吹不黑\n\n先说结论：值得买！\n\n👍 优点：效果好、性价比高\n👎 缺点：包装一般但不影响使用\n\n推荐指数：⭐⭐⭐⭐\n\n适合${audience || '所有人'}使用\n\n#真实测评 #${product}`,
    '教程': `📖 ${product}的正确使用方法来啦\n\n很多${audience || '宝子'}买了不会用\n今天手把手教学：\n\n📝 Step1：准备工作\n📝 Step2：正确操作\n📝 Step3：后续维护\n\n⚠️ 常见误区要避开！\n学会收藏🌟\n\n#教程 #${product}`,
    '对比': `⚖️ ${product}值不值得买？\n\n对比市面几款热门产品：\n\n🏆 ${product}——性价比之王\n💸 价格亲民，${audience || '学生党'}也买得起\n✨ 效果不输大牌\n\n一句话：买它！\n\n#选购指南 #${product} #对比`,
  };
  return t[style] || t['种草'];
}
