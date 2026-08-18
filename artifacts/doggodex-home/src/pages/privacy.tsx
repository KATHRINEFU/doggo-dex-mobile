export function Privacy() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 md:py-24">
      <div className="container mx-auto px-4 md:px-6 max-w-4xl">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-12 prose prose-slate md:prose-lg max-w-none">
          <h1 className="text-3xl md:text-5xl font-display font-bold text-slate-900 mb-2">隐私政策 (Privacy Policy)</h1>
          <p className="text-slate-500 font-medium mb-8">最后更新时间：2026年8月</p>

          <p>
            欢迎使用 PawDex（以下简称“我们”或“本应用”）。我们非常重视您的隐私，并致力于保护您的个人信息。本隐私政策详细说明了我们在您使用本应用时，如何收集、使用、存储和保护您的数据。
          </p>

          <h2 className="text-2xl font-display font-bold text-slate-900 mt-10 mb-4">1. 我们收集和使用哪些信息</h2>
          
          <h3 className="text-xl font-bold text-slate-800 mt-6 mb-3">1.1 相机与照片权限</h3>
          <p>
            本应用的核心功能是识别狗狗品种。为此，我们需要访问您的设备相机和照片库。品种识别采用
            <strong>“端侧优先、必要时云端补充”</strong>的方式，具体如下：
          </p>
          <ul>
            <li>
              <strong>端侧识别：</strong>在 iOS / Android 应用中，我们首先使用打包在应用内的端侧模型（On-device AI）进行识别。当端侧模型判定为狗狗且置信度达到我们设定的阈值（当前为 60%）时，识别在您的设备本地完成，
              <strong>该次识别不会将您的照片发送到我们的服务器</strong>。
            </li>
            <li>
              <strong>云端补充识别：</strong>当端侧模型不可用、运行出错、未能识别，或置信度低于上述阈值时，本应用会将该张照片以 Base64 编码的形式发送至我们的服务器进行进一步识别。
            </li>
            <li>
              <strong>网页版：</strong>网页版不运行端侧模型，因此在网页端进行的每一次识别都会将照片发送至我们的服务器。
            </li>
            <li>
              <strong>相册照片：</strong>无论是即时拍摄还是从相册中选择的照片，均适用上述相同规则。
            </li>
            <li>
              <strong>取消操作：</strong>若您在请求发出后取消识别，我们将不再向您展示识别结果，但已经发出的网络请求可能仍会在后台完成。
            </li>
          </ul>
          <p>
            因此，我们<strong>不会</strong>声称“您的照片永远不会离开您的设备”。在上述云端补充识别的情形下，您的照片会离开设备并被处理。关于处理方与保存期限，请参见第 2 节与第 3 节。
          </p>

          <h3 className="text-xl font-bold text-slate-800 mt-6 mb-3">1.2 账户与个人资料数据</h3>
          <p>
            当您创建 PawDex 账户时，我们会收集您的基本信息（如用户名、电子邮件地址和个人头像）。这些信息仅用于创建您的公开档案、排行榜展示以及跨设备同步您的数据。
          </p>

          <h3 className="text-xl font-bold text-slate-800 mt-6 mb-3">1.3 游戏进度与 Doggo Dex 数据</h3>
          <p>
            您的收藏图鉴（Doggo Dex）、经验值（XP）、连续打卡记录与徽章进度<strong>保存在您的设备本地</strong>，并按登录账户分别存储。当您成功收集某个品种时，对应的照片会以设备本地路径的形式记录在该品种下（每个品种最多保留 10 张），
            <strong>这些收藏照片不会被上传至我们的服务器</strong>。
          </p>
          <p>
            为了实现全球排行榜，我们仅会将汇总数据（例如您的累计经验值与已收集品种数量）以及您的账户信息（账户 ID、用户名、显示名称、可选的国家/地区与头像链接）同步至我们的服务器。
          </p>

          <h2 className="text-2xl font-display font-bold text-slate-900 mt-10 mb-4">2. 第三方处理方</h2>

          <h3 className="text-xl font-bold text-slate-800 mt-6 mb-3">2.1 识别照片的处理方</h3>
          <p>
            当发生第 1.1 节所述的云端补充识别时，您的照片会被发送至我们的服务器。我们的服务器会在内存中对图片进行必要的格式转换，并可能将其转发给以下处理方：
          </p>
          <ul>
            <li>
              <strong>我们自有的品种识别服务：</strong>用于在服务器端运行品种识别模型。根据我们的部署配置，该服务可能运行在我们的服务器上，或运行在我们所使用的第三方模型托管平台上。
            </li>
            <li>
              <strong>OpenAI：</strong>当上述识别仍无法给出可靠结果时，我们会将该张照片发送至 OpenAI 的模型服务进行图像理解，以返回最终的品种判断。此时该照片会由 OpenAI 按其自身的条款与隐私政策进行处理。
            </li>
          </ul>
          <p>
            识别请求本身不会附带您的账户 ID、用户名或邮箱等身份信息，但请注意，照片内容本身可能包含可识别个人的信息（例如出现在画面中的人物）。请避免上传您不希望被第三方处理的照片。
          </p>

          <h3 className="text-xl font-bold text-slate-800 mt-6 mb-3">2.2 成就徽章的 AI 生成</h3>
          <p>
            当您解锁特定成就时，本应用会为您生成独特的成就徽章。生成徽章所使用的指令仅包含徽章名称与类型等信息，
            <strong>不包含您拍摄的任何真实照片，也不包含您的个人身份信息</strong>。生成的徽章图片会保存在我们的对象存储中，并与您的账户关联。
          </p>

          <h3 className="text-xl font-bold text-slate-800 mt-6 mb-3">2.3 账户与身份验证</h3>
          <p>
            我们使用 Clerk 提供账户注册、登录与身份验证服务。若您选择设置个人头像，该头像会被上传并保存至 Clerk，并可能显示在您的公开档案与排行榜中。
          </p>

          <h2 className="text-2xl font-display font-bold text-slate-900 mt-10 mb-4">3. 数据存储与保留</h2>
          <ul>
            <li>
              <strong>识别照片：</strong>用于云端补充识别的照片仅在处理该次请求期间使用，我们不会将其写入我们的数据库或对象存储。我们的服务器会记录识别过程的运行日志（例如识别结果与耗时），这些日志可能在有限期限内保留用于排查故障。照片在第三方处理方（如 OpenAI）的保存期限，适用其各自的政策，我们无法代其作出承诺。
            </li>
            <li>
              <strong>收藏与进度：</strong>保存在您的设备本地，卸载应用或清除应用数据即会删除。
            </li>
            <li>
              <strong>账户与排行榜数据：</strong>保存在我们受保护的服务器上，直至您要求删除账户。
            </li>
            <li>
              <strong>成就徽章图片：</strong>保存在我们的对象存储中，直至您要求删除账户。
            </li>
          </ul>
          <p>
            如果您希望删除账户及其关联数据，可以通过应用内的设置选项，或通过下方邮箱联系我们。
          </p>

          <h2 className="text-2xl font-display font-bold text-slate-900 mt-10 mb-4">4. 儿童隐私</h2>
          <p>
            本应用不面向 13 岁以下的儿童提供。我们不会有意收集 13 岁以下儿童的个人信息。如果我们发现无意中收集了此类信息，将立即采取措施删除相关数据。
          </p>

          <h2 className="text-2xl font-display font-bold text-slate-900 mt-10 mb-4">5. 隐私政策的变更</h2>
          <p>
            我们可能会适时更新本隐私政策。如果发生重大变更，我们会在应用内或通过电子邮件通知您。请定期查阅本页面以了解最新的隐私保护措施。
          </p>

          <h2 className="text-2xl font-display font-bold text-slate-900 mt-10 mb-4">6. 联系我们</h2>
          <p>
            如果您对本隐私政策有任何疑问、意见或需要行使您的数据隐私权利，请通过以下电子邮件与我们联系：
          </p>
          <div className="bg-slate-100 p-4 rounded-xl inline-block mt-2">
            <a href="mailto:yuehaofu208@gmail.com" className="text-primary font-medium hover:underline text-lg">yuehaofu208@gmail.com</a>
          </div>
        </div>
      </div>
    </div>
  );
}
