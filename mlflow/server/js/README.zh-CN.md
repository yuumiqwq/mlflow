# MLflow 3.18.0 简体中文界面

此分支以官方 `v3.18.0` 为基线，基线提交为 `ba41106d110b67096384da12b6b85473457598db`。界面沿用 React Intl、官方消息提取器和编译器，源代码位于 MLflow 原有前端目录。后端、REST 路由、模型数据库和产物存储不作修改。fork 的 `master` 用于保留上游版本；定制改动在 `custom/zh-cn-3.18.0` 分支维护。

`DEFAULT_LOCALE` 仍为 `en`，用于英语消息底稿；`DEFAULT_UI_LOCALE` 为 `zh-CN`。首次访问默认使用简体中文，设置中的语言选择器可切换 English。URL 查询参数 `?l=en` 或 `?l=zh-CN` 位于 `#` 前，其选择沿用原有 localStorage 机制。切换保留部署前缀和深链接。

## 本地构建与检查

使用 Node 24 和仓库附带的 Yarn 4.12.0，无需全局安装 Yarn。在本目录执行：

```sh
node yarn/releases/yarn-4.12.0.cjs install --immutable
node yarn/releases/yarn-4.12.0.cjs i18n:check
node yarn/releases/yarn-4.12.0.cjs i18n:audit
node yarn/releases/yarn-4.12.0.cjs type-check
node yarn/releases/yarn-4.12.0.cjs lint
node yarn/releases/yarn-4.12.0.cjs prettier:check
node yarn/releases/yarn-4.12.0.cjs build
```

`build` 与 `start` 会先编译 `src/lang/*.json`，输出至被 Git 忽略的 `src/lang/compiled/`。英语直接使用源码中的 `defaultMessage`。构建沿用 `static-files/` 资源前缀，可配合 MLflow 的 `--static-prefix /mlflow`。设置 `BUILD_PATH` 可将产物移至项目的 `codex-generated/build`；在 Windows 上同时将 `TEMP`、`TMP`、`YARN_CACHE_FOLDER`、`npm_config_cache` 和浏览器缓存指向 E 盘的 `codex-generated`。

锁文件保留上游依赖版本，并显式声明设计系统已使用的 `antd@4.16.8`，以配置其中文控件语言。Windows 安装更新了 `file:./vendor/design-system` 的本地包校验值，没有升级该包。

## 翻译维护与覆盖口径

官方基线有 5,026 个英语消息 ID，原中文文件与当前 ID 的交集为 1,748 个，约 34.8%。本分支复用有效原译文，并按相同英语源文迁移可复用条目；新增的旧式 JSX 标签、运行属性展示标签和分页组件均进入原生提取流程。

当前目录有 5,285 个源消息 ID，中文目录按 ID 覆盖 5,285 个。80 项与英语底稿相同，主要是 `Python`、`JSON`、模型或协议名称、代码示例、数值与纯变量表达式。`i18n:audit` 独立检查缺失 ID、ICU 变量、数值和日期参数、select 分支及富文本标签，并报告相同文本和过期 ID。此数字表示消息目录覆盖率，不代表所有第三方组件及服务器诊断内容都已中文化。

主要验证范围包括全局导航、实验列表、运行列表与详情、模型注册表、指标图表、筛选排序、列选择、设置和常用弹窗。生成式 AI、网关、提示、数据集和跟踪页面的原生消息目录也已补齐；专用服务未配置的页面无法完成全部功能验收。管理权限页中尚未接入 React Intl 的少量动态可访问性标签、第三方绘图库内部工具提示以及服务器返回的原始错误详情仍可能含英文。代码示例、用户命名、日志字段、参数与指标键保持原值。

后续增加文案时，在实际渲染处使用 `FormattedMessage`、`intl.formatMessage` 或旧式组件的 `sourceIntl.formatMessage`，然后执行 `i18n` 提取并补充中文消息。运行属性常量同时承担持久化标识符的作用，应使用 `getRunAttributeLabel` 翻译展示值，保留排序键、列 ID 和筛选表达式。升级上游时，在新 tag 上移植定制提交，重新提取与审计目录，再以对应版本后端进行验收。

## 可读性

基础字号为 16px，较小字号为 14px，控件与表格文本约 15px，标题为 18–24px。主题 token 与旧控件样式共同调整行高，运行表格行高为 40px，实验列表行高至少 44px。手机采用折叠侧栏、可滚动表格和可换行操作区域，不使用页面 zoom。

## 静态发布与回滚

完成源码提交和本地验收后，在本目录使用 Python 3.10 或更新版本打包：

```sh
python scripts/package-static-ui.py --build /path/to/build --output /path/to/ui-release.tar.gz
```

归档包含每个文件的 SHA-256、MLflow 版本及 Git 提交号。将归档和 `scripts/deploy-static-ui.py` 上传到服务器的发布目录，使用现有 MLflow venv 的 Python 执行：

```sh
/opt/11tiger-mlflow/current/venv/bin/python deploy-static-ui.py \
  --archive /path/to/ui-release.tar.gz --sha256 ARCHIVE_SHA256 \
  --releases /opt/11tiger-mlflow/ui-releases \
  --health-url http://127.0.0.1:8805/mlflow/ --service 11tiger-mlflow.service
```

脚本从当前 Python 包定位真实静态目录，验证服务器版本、归档 SHA、全部文件 SHA 和资源路径。首次部署使用 Linux `renameat2(RENAME_EXCHANGE)` 原子交换原目录与新符号链接，并将官方目录保留为独立备份。后续部署原子替换符号链接。旧页面需要的内容寻址资源会保留，以支持部署前已打开的标签页。HTTP 校验失败时会自动恢复上一版本。

首页 HTTP 验收要求返回 200，并引用该构建预期的主 JS 和 CSS；对应静态资源继续按 SHA-256 严格核验，允许后端为首页添加运行时内容。解包目录权限在切换前设为静态资源可读权限，并以现有服务用户检查首页可读性。

发布回执位于新 release 的 `deployment-receipt.json`。回滚使用同一脚本：

```sh
/opt/11tiger-mlflow/current/venv/bin/python deploy-static-ui.py \
  --rollback /path/to/release/deployment-receipt.json \
  --releases /opt/11tiger-mlflow/ui-releases \
  --health-url http://127.0.0.1:8805/mlflow/ --service 11tiger-mlflow.service
```

发布流程不修改认证配置、Caddyfile、数据库或产物，也不执行服务重启。发布前后另行核对数据库逻辑记录和历史产物校验值，并验证门户 cookie、匿名跳转、SDK Basic 认证及其他网站路径。验收实验应使用独立名称，完成后仅按其确切 ID 清理。
