# 倒数日 / Countdown Days

![Countdown Days](docs/countdown-days-cover.png)

[English](#english) · [截图](docs/screenshots.md) · [详细说明](docs/guide.md)

生日、纪念日、每月还款日，放在 DSH 里随手看一眼。支持公历和农历、循环日期、分类筛选、置顶和提醒，数据留在当前浏览器，不提供云同步。

## 安装与使用

下载仓库后，让 DSH agent 用 `plugin_manager` 安装本地目录，或调用工具（不是终端命令）：

```json
{"action":"install_bundle","target":"<countdown-days 目录的绝对路径>"}
```

需要支持 bundle 的 Harness。安装影响当前 profile，按返回提示刷新后，从侧边栏打开「倒数日」。Windows JSON 路径用 `\\` 表示反斜杠；本地链接安装后请保留目录。

点击「新建倒数日」，填好名称和日期，选重复方式、提醒时间，保存即可。公历支持每周、每月和每年重复，农历支持每年重复，含闰月。农历换算依赖浏览器的 ICU 中国历法。

## 提醒和备份

- 设置中打开「桌面通知」才会检查定时提醒，系统通知还需要浏览器授权。当天提示条不受这个开关影响。
- 提醒依赖页面持续加载，关页、休眠或后台限制可能漏报，别用它作为重要事项的唯一提醒。
- 在设置里导出 JSON 备份。**导入会覆盖全部现有记录，不会合并**，请先备份。
- 数据和备份未加密，清除站点数据或更换浏览器、地址可能丢失记录。通知也可能显示在锁屏上，别填写敏感内容。

## English

Keep birthdays, anniversaries and payment dates close at hand in DSH. Supports Gregorian and Chinese lunar dates, recurring events, categories, pinning and reminders. Data stays in the current browser; no cloud sync.

### Install and use

Download the repository and ask a DSH agent to install its local directory with the `plugin_manager` tool (not a shell command):

```json
{"action":"install_bundle","target":"<absolute path to countdown-days>"}
```

Requires a bundle-capable Harness. Installation affects the current profile; follow the returned instructions and open **Countdown Days** from the sidebar. Escape Windows path backslashes as `\\` in JSON. Keep the source directory if installed as a local link.

Add an event, choose a date, recurrence and reminder time, then save. Gregorian dates repeat weekly, monthly or yearly; lunar dates repeat yearly, including leap months. Lunar conversion requires the browser's ICU Chinese calendar.

### Reminders and backups

- Enable **Desktop notifications** for scheduled reminder checks; system notifications also need browser permission. The today banner works independently.
- The page must stay loaded. Closing it, device sleep or background restrictions can cause missed reminders. Keep another reminder for important events.
- Export JSON backups from Settings. **Import replaces all existing events; it does not merge them.** Back up first.
- Data and backups are unencrypted. Clearing site data or changing browser or origin can lose records. Notifications may appear on the lock screen, so avoid sensitive content.

[Full guide](docs/guide.md) · [Screenshots](docs/screenshots.md) · [Report an issue](https://github.com/Veagau/dsh-countdown-days/issues)

## 开发 / Development

```sh
npm run check
npm test
```

包含农历、存储、备份和设置回归测试，不代表完整浏览器兼容性测试。
Includes lunar, storage, backup and settings regressions, not complete browser compatibility testing.

[MIT](LICENSE)
