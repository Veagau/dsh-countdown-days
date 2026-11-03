/**
 * Countdown Days — a local-first countdown panel for the DeepSeek Harness Web UI.
 *
 * Everything lives in the page: records in localStorage, solar/lunar date math on
 * top of the ICU Chinese calendar, and reminders scheduled by a page-level timer.
 * The Host half stays empty.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-countdown-days',
  factory(require) {
    'use strict';

    const React = require('react');
    const h = React.createElement;
    const useState = React.useState;
    const useEffect = React.useEffect;
    const useMemo = React.useMemo;
    const useRef = React.useRef;
    const useCallback = React.useCallback;

    const NS = 'dsh-countdown-days';
    const PANEL_ID = 'countdown-days';
    const STORAGE_KEY = 'dsh.countdown-days.v1';
    const SETTINGS_KEY = 'dsh.countdown-days.settings.v1';
    const SCHEMA = 'dsh.countdown-days';
    const STORE_VERSION = 1;
    const REMINDER_TICK_MS = 30000;
    const MS_DAY = 86400000;
    const MAX_EVENTS = 500;

    const CATEGORIES = ['birthday', 'anniversary', 'important', 'loan', 'creditcard', 'custom'];
    const RECURRENCES = ['yearly', 'monthly', 'weekly', 'once'];
    const REMINDER_CHOICES = [0, 1, 3, 7, 14, 30];
    const LUNAR_MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
    const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const EN = {
      'panel.title': 'Countdown Days',
      'panel.subtitle': 'Every date worth looking forward to',
      'list.heroLabel': 'Nearest date',
      'list.daysAfter': 'days to go',
      'list.daysPast': 'days ago',
      'list.today': 'Today',
      'list.todayHint': "It's today",
      'list.next': 'Next',
      'list.search': 'Search name or note',
      'list.count': '{n} countdowns',
      'list.countFiltered': '{shown} of {total}',
      'list.empty': 'No countdowns yet',
      'list.emptyDesc': 'Start with a birthday, an anniversary or a repayment day — and keep the date worth waiting for.',
      'list.emptyBirthday': 'Add a birthday',
      'list.emptyAnniversary': 'Add an anniversary',
      'list.emptyLoan': 'Add a repayment day',
      'list.none': 'No matching countdowns',
      'list.noneDesc': 'Try another keyword or category.',
      'list.past': 'Past dates',
      'list.footnote': 'Stored only in this browser · Lunar dates follow the ICU Chinese calendar',
      'list.todayReminder': 'Today: {names}',
      'action.add': 'Add countdown',
      'action.addShort': 'Add',
      'action.settings': 'Settings',
      'action.close': 'Close',
      'action.cancel': 'Cancel',
      'action.save': 'Save',
      'action.edit': 'Edit',
      'action.delete': 'Delete',
      'action.pin': 'Pin to top',
      'action.unpin': 'Unpin',
      'action.export': 'Export backup',
      'action.import': 'Import backup',
      'action.clear': 'Clear all',
      'action.allowNotify': 'Allow notifications',
      'action.testNotify': 'Send test reminder',
      'action.confirmImport': 'Import',
      'cat.birthday': 'Birthday',
      'cat.anniversary': 'Anniversary',
      'cat.important': 'Important',
      'cat.loan': 'Repayment',
      'cat.creditcard': 'Credit card',
      'cat.custom': 'Custom',
      'filter.all': 'All',
      'recur.yearly': 'Every year',
      'recur.monthly': 'Every month',
      'recur.weekly': 'Every week',
      'recur.once': 'One time',
      'date.lunar': 'Lunar',
      'date.leap': 'Leap month',
      'editor.createTitle': 'New countdown',
      'editor.editTitle': 'Edit countdown',
      'editor.name': 'Name',
      'editor.namePlaceholder': 'e.g. Mom’s birthday, wedding anniversary, mortgage',
      'editor.category': 'Category',
      'editor.date': 'Date',
      'editor.solar': 'Solar',
      'editor.lunar': 'Lunar',
      'editor.lunarYear': 'Year',
      'editor.lunarMonth': 'Month',
      'editor.lunarDay': 'Day',
      'editor.leap': 'Leap month',
      'editor.lunarHint': 'The year is only used to resolve leap months; yearly repeats follow every lunar year.',
      'editor.recurrence': 'Repeat',
      'editor.reminder': 'Reminder',
      'editor.reminderDays': 'Remind before',
      'editor.reminderTime': 'Time',
      'editor.reminderHint': 'In-app reminders always appear; desktop notifications need browser permission.',
      'editor.sameDay': 'On the day',
      'editor.daysBefore': '{n} day(s) before',
      'editor.note': 'Note',
      'editor.notePlaceholder': 'Optional — gift ideas, transfer amount…',
      'editor.pin': 'Pin to top',
      'editor.preview': 'Next: {date} · {lunar}',
      'editor.previewPast': 'This date has already passed',
      'editor.errName': 'Please enter a name.',
      'editor.errDate': 'Please choose a valid date.',
      'editor.errLunar': 'Please choose a valid lunar date.',
      'editor.errLeap': 'This lunar year has no such leap month.',
      'card.reminder': 'Reminder set',
      'card.pinned': 'Pinned',
      'settings.title': 'Countdown settings',
      'settings.notify': 'Desktop notifications',
      'settings.notifyDesc': 'Push a system notification at reminder time. Requires browser permission.',
      'settings.notifyOn': 'Allowed',
      'settings.notifyOff': 'Blocked — in-app reminders still work',
      'settings.notifyAsk': 'Not requested yet',
      'settings.defaultTime': 'Default reminder time',
      'settings.defaultTimeHint': 'Used for new countdowns; existing ones keep their own time.',
      'settings.data': 'Data',
      'settings.exportDesc': 'Download every countdown as a JSON backup.',
      'settings.importDesc': 'Restore from a JSON backup. This replaces the current data.',
      'settings.clearDesc': 'Delete every countdown from this browser.',
      'settings.clearConfirm': 'Click again to confirm',
      'settings.about': 'About',
      'settings.storage': 'Storage',
      'settings.storageValue': 'Browser localStorage (local only)',
      'settings.lunar': 'Lunar calendar',
      'settings.lunarValue': 'ICU Chinese calendar',
      'settings.version': 'Version',
      'settings.count': 'Countdowns',
      'settings.test': 'A test notification has been sent.',
      'toast.saved': 'Saved',
      'toast.deleted': 'Deleted',
      'toast.exported': 'Backup exported',
      'toast.imported': 'Imported {n} countdowns',
      'toast.cleared': 'All countdowns cleared',
      'toast.invalid': 'That file is not a valid countdown backup.',
      'toast.storageLocked': 'Cannot save: stored data is invalid, unsupported, changed elsewhere, or unavailable. Your original data was preserved.',
      'storage.readError': 'Could not read countdown data. The original data is preserved; saving and export are disabled.',
      'toast.notifyDenied': 'Notifications are blocked; in-app reminders will still appear.',
      'toast.test': 'Test reminder sent',
      'reminder.title': 'Countdown reminder',
      'reminder.today': 'today',
      'reminder.inDays': 'in {n} days',
      'delete.title': 'Delete this countdown?',
      'delete.desc': '“{name}” will be removed. This cannot be undone.',
      'import.title': 'Import backup',
      'import.desc': 'Import {n} countdowns and replace the current {m}?',
      'weekday.0': 'Sun',
      'weekday.1': 'Mon',
      'weekday.2': 'Tue',
      'weekday.3': 'Wed',
      'weekday.4': 'Thu',
      'weekday.5': 'Fri',
      'weekday.6': 'Sat',
    };

    const ZH = {
      'panel.title': '倒数日',
      'panel.subtitle': '记住每一个值得期待的日子',
      'list.heroLabel': '最近的日子',
      'list.daysAfter': '天后',
      'list.daysPast': '天前',
      'list.today': '今天',
      'list.todayHint': '就是今天',
      'list.next': '下次',
      'list.search': '搜索名称或备注',
      'list.count': '共 {n} 个日子',
      'list.countFiltered': '显示 {shown} / {total} 个日子',
      'list.empty': '还没有记录任何日子',
      'list.emptyDesc': '从生日、纪念日或还贷日开始，记下值得期待的那一天。',
      'list.emptyBirthday': '记录一个生日',
      'list.emptyAnniversary': '记录一个纪念日',
      'list.emptyLoan': '记录还贷日',
      'list.none': '没有匹配的日子',
      'list.noneDesc': '换个关键词或分类试试。',
      'list.past': '已过去的日子',
      'list.footnote': '数据只保存在当前浏览器 · 农历按 ICU 中国历法换算',
      'list.todayReminder': '今天：{names}',
      'action.add': '新建倒数日',
      'action.addShort': '新建',
      'action.settings': '设置',
      'action.close': '关闭',
      'action.cancel': '取消',
      'action.save': '保存',
      'action.edit': '编辑',
      'action.delete': '删除',
      'action.pin': '置顶',
      'action.unpin': '取消置顶',
      'action.export': '导出备份',
      'action.import': '导入备份',
      'action.clear': '清空数据',
      'action.allowNotify': '允许通知',
      'action.testNotify': '发送测试提醒',
      'action.confirmImport': '确认导入',
      'cat.birthday': '生日',
      'cat.anniversary': '纪念日',
      'cat.important': '重要日子',
      'cat.loan': '还贷日',
      'cat.creditcard': '信用卡',
      'cat.custom': '自定义',
      'filter.all': '全部',
      'recur.yearly': '每年',
      'recur.monthly': '每月',
      'recur.weekly': '每周',
      'recur.once': '不重复',
      'date.lunar': '农历',
      'date.leap': '闰月',
      'editor.createTitle': '新建倒数日',
      'editor.editTitle': '编辑倒数日',
      'editor.name': '名称',
      'editor.namePlaceholder': '例如：妈妈生日、结婚纪念日、房贷还款',
      'editor.category': '分类',
      'editor.date': '日期',
      'editor.solar': '公历',
      'editor.lunar': '农历',
      'editor.lunarYear': '年',
      'editor.lunarMonth': '月',
      'editor.lunarDay': '日',
      'editor.leap': '闰月',
      'editor.lunarHint': '年份仅用于确定闰月；按年重复会跟随每个农历年。',
      'editor.recurrence': '重复',
      'editor.reminder': '提醒',
      'editor.reminderDays': '提前提醒',
      'editor.reminderTime': '提醒时间',
      'editor.reminderHint': '站内提醒始终显示；桌面通知需要浏览器授权。',
      'editor.sameDay': '当天',
      'editor.daysBefore': '提前 {n} 天',
      'editor.note': '备注',
      'editor.notePlaceholder': '可选，例如：准备礼物、转账金额…',
      'editor.pin': '置顶显示',
      'editor.preview': '下一次：{date} · {lunar}',
      'editor.previewPast': '该日期已过去',
      'editor.errName': '请填写名称。',
      'editor.errDate': '请选择有效日期。',
      'editor.errLunar': '请选择有效的农历日期。',
      'editor.errLeap': '所选年份没有这个闰月。',
      'card.reminder': '已设提醒',
      'card.pinned': '已置顶',
      'settings.title': '倒数日设置',
      'settings.notify': '桌面通知',
      'settings.notifyDesc': '在提醒时间推送系统通知，需要浏览器授权。',
      'settings.notifyOn': '已允许',
      'settings.notifyOff': '已拒绝 — 仍会显示站内提醒',
      'settings.notifyAsk': '尚未授权',
      'settings.defaultTime': '默认提醒时间',
      'settings.defaultTimeHint': '用于新建倒数日，已有记录保留各自的时间。',
      'settings.data': '数据管理',
      'settings.exportDesc': '把全部记录导出为 JSON 备份。',
      'settings.importDesc': '从 JSON 备份恢复，会覆盖当前数据。',
      'settings.clearDesc': '删除当前浏览器中的全部倒数日。',
      'settings.clearConfirm': '再次点击确认',
      'settings.about': '关于',
      'settings.storage': '存储方式',
      'settings.storageValue': '浏览器 localStorage（仅本地）',
      'settings.lunar': '农历支持',
      'settings.lunarValue': 'ICU 中国历法',
      'settings.version': '版本',
      'settings.count': '记录数量',
      'settings.test': '测试提醒已发送。',
      'toast.saved': '已保存',
      'toast.deleted': '已删除',
      'toast.exported': '备份已导出',
      'toast.imported': '已导入 {n} 条记录',
      'toast.cleared': '已清空全部记录',
      'toast.invalid': '备份文件格式不正确。',
      'toast.storageLocked': '无法保存：存储数据损坏、不受支持、已被其他页面更改或不可用。原始数据已保留。',
      'storage.readError': '无法读取倒数日数据，原始数据已保留；保存和导出已停用。',
      'toast.notifyDenied': '通知权限未开启，仍会显示站内提醒。',
      'toast.test': '测试提醒已发送',
      'reminder.title': '倒数日提醒',
      'reminder.today': '就是今天',
      'reminder.inDays': '还有 {n} 天',
      'delete.title': '删除这个日子？',
      'delete.desc': '“{name}”将被删除，无法恢复。',
      'import.title': '导入备份',
      'import.desc': '将导入 {n} 条记录，并覆盖当前 {m} 条记录。',
      'weekday.0': '周日',
      'weekday.1': '周一',
      'weekday.2': '周二',
      'weekday.3': '周三',
      'weekday.4': '周四',
      'weekday.5': '周五',
      'weekday.6': '周六',
    };

    /* ------------------------------------------------------------------ */
    /* Styles                                                             */
    /* ------------------------------------------------------------------ */

    const CSS = [
      ':root{--dsh-cd-accent:#5b6ef5;--dsh-cd-accent-strong:#4757d8;--dsh-cd-accent-soft:rgba(91,110,245,.14);--dsh-cd-accent-ring:rgba(91,110,245,.28);--dsh-cd-accent-ink:#ffffff;--dsh-cd-cat:#7a8496;--dsh-cd-cat-soft:rgba(122,132,150,.14)}',
      '.dsh-cd-root{display:flex;flex-direction:column;height:100%;min-height:0;background-color:var(--dsw-alias-bg-layer-1);background-image:linear-gradient(var(--dsw-alias-bg-layer-1),var(--dsw-alias-bg-layer-1));backdrop-filter:blur(20px) saturate(120%);-webkit-backdrop-filter:blur(20px) saturate(120%);color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.45}',
      '.dsh-cd-head{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:18px 28px 16px;border-bottom:1px solid var(--dsw-alias-border-l1)}',
      '.dsh-cd-head-main{display:flex;flex-direction:column;gap:5px;min-width:0}',
      '.dsh-cd-title-row{display:flex;align-items:center;gap:10px}',
      '.dsh-cd-logo{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;flex:none;border-radius:10px;color:var(--dsh-cd-accent);background:var(--dsh-cd-accent-soft)}',
      '.dsh-cd-title{margin:0;font-size:17px;font-weight:600;letter-spacing:.01em}',
      '.dsh-cd-sub{margin:0;font-size:12.5px;color:var(--dsw-alias-label-secondary)}',
      '.dsh-cd-head-side{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap}',
      '.dsh-cd-today{display:flex;flex-direction:column;align-items:flex-end;gap:1px;padding:6px 12px;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);line-height:1.3}',
      '.dsh-cd-today-date{font-size:13px;font-weight:600}',
      '.dsh-cd-today-lunar{font-size:11.5px;color:var(--dsw-alias-label-secondary)}',
      '.dsh-cd-actions{display:flex;align-items:center;gap:8px}',
      '.dsh-cd-body{flex:1;min-height:0;overflow-y:auto}',
      '.dsh-cd-column{display:flex;flex-direction:column;gap:16px;max-width:980px;margin:0 auto;padding:20px 28px 56px}',
      '.dsh-cd-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '.dsh-cd-search{position:relative;display:flex;align-items:center;flex:1;min-width:180px;max-width:320px}',
      '.dsh-cd-search svg{position:absolute;left:10px;color:var(--dsw-alias-label-secondary);pointer-events:none}',
      '.dsh-cd-search .dsh-cd-input{padding-left:32px}',
      '.dsh-cd-chips{display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
      '.dsh-cd-chip{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 11px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;cursor:pointer;transition:background .12s ease,color .12s ease,border-color .12s ease}',
      '.dsh-cd-chip:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.dsh-cd-chip.is-on{color:var(--dsh-cd-accent);background:var(--dsh-cd-accent-soft);border-color:color-mix(in srgb,var(--dsh-cd-accent) 35%,transparent)}',
      '.dsh-cd-dot{width:6px;height:6px;border-radius:999px;background:var(--dsh-cd-cat);flex:none}',
      '.dsh-cd-reminderbar{display:flex;align-items:center;gap:9px;padding:10px 14px;border-radius:12px;border:1px solid color-mix(in srgb,var(--dsh-cd-accent) 30%,transparent);background:var(--dsh-cd-accent-soft);color:var(--dsh-cd-accent);font-size:12.5px}',
      '.dsh-cd-reminderbar b{font-weight:600}',
      '.dsh-cd-hero{position:relative;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:20px 22px;border:1px solid var(--dsw-alias-border-l1);border-radius:16px;background-color:var(--dsw-alias-bg-layer-1);background-image:linear-gradient(120deg,color-mix(in srgb,var(--dsh-cd-cat) 16%,transparent),transparent 62%);box-shadow:inset 3px 0 0 var(--dsh-cd-cat)}',
      '.dsh-cd-hero-main{display:flex;flex-direction:column;gap:6px;min-width:0}',
      '.dsh-cd-hero-label{font-size:11.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}',
      '.dsh-cd-hero-title{margin:0;font-size:23px;font-weight:650;letter-spacing:-.01em;overflow-wrap:anywhere}',
      '.dsh-cd-hero-date{font-size:13px;color:var(--dsw-alias-label-secondary)}',
      '.dsh-cd-hero-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:2px}',
      '.dsh-cd-hero-dday{display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex:none}',
      '.dsh-cd-hero-num{font-size:54px;font-weight:700;line-height:1;letter-spacing:-.04em;color:var(--dsh-cd-cat);font-variant-numeric:tabular-nums}',
      '.dsh-cd-hero-unit{font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.dsh-cd-hero .dsh-cd-iconbtn{opacity:.75}',
      '.dsh-cd-tag{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:999px;border:1px solid color-mix(in srgb,var(--dsh-cd-cat) 30%,transparent);background:var(--dsh-cd-cat-soft);color:var(--dsh-cd-cat);font-size:11.5px;line-height:1}',
      '.dsh-cd-tag--plain{border-color:var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}',
      '.dsh-cd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:12px}',
      '.dsh-cd-card{position:relative;display:flex;flex-direction:column;gap:8px;min-width:0;padding:14px 16px 13px;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background-color:var(--dsw-alias-bg-layer-1);background-image:linear-gradient(150deg,color-mix(in srgb,var(--dsh-cd-cat) 8%,transparent),transparent 62%);transition:border-color .14s ease,transform .14s ease,box-shadow .14s ease}',
      '.dsh-cd-card:hover{border-color:color-mix(in srgb,var(--dsh-cd-cat) 38%,var(--dsw-alias-border-l1));transform:translateY(-1px);box-shadow:0 8px 20px rgba(0,0,0,.08)}',
      '.dsh-cd-card--past{opacity:.66}',
      '.dsh-cd-card--past:hover{opacity:1}',
      '.dsh-cd-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:22px}',
      '.dsh-cd-card-actions{display:flex;align-items:center;opacity:0;transition:opacity .14s ease}',
      '.dsh-cd-card:hover .dsh-cd-card-actions,.dsh-cd-card:focus-within .dsh-cd-card-actions{opacity:1}',
      '.dsh-cd-card-title{margin:0;font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsh-cd-card-dday{display:flex;align-items:baseline;gap:5px;color:var(--dsh-cd-cat)}',
      '.dsh-cd-card-num{font-size:30px;font-weight:700;line-height:1;letter-spacing:-.03em;font-variant-numeric:tabular-nums}',
      '.dsh-cd-card-num--text{font-size:21px;letter-spacing:0}',
      '.dsh-cd-card-unit{font-size:11.5px;color:var(--dsw-alias-label-secondary)}',
      '.dsh-cd-card-date{font-size:12px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsh-cd-card-sub{font-size:11.5px;color:var(--dsw-alias-state-idle-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dsh-cd-card-foot{display:flex;align-items:center;gap:6px;margin-top:auto;padding-top:2px;flex-wrap:wrap}',
      '.dsh-cd-section-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-top:6px}',
      '.dsh-cd-section-title{margin:0;font-size:13px;font-weight:600;color:var(--dsw-alias-label-secondary)}',
      '.dsh-cd-count{font-size:12.5px;color:var(--dsw-alias-label-secondary);margin:0}',
      '.dsh-cd-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:48px 24px;border:1px dashed var(--dsw-alias-border-l2);border-radius:16px;text-align:center;color:var(--dsw-alias-label-secondary)}',
      '.dsh-cd-empty-icon{display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:15px;color:var(--dsh-cd-accent);background:var(--dsh-cd-accent-soft)}',
      '.dsh-cd-empty-title{margin:0;font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '.dsh-cd-empty-desc{margin:0;max-width:420px;font-size:12.5px}',
      '.dsh-cd-empty-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:4px}',
      '.dsh-cd-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:32px;padding:0 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;font-weight:500;white-space:nowrap;cursor:pointer;transition:background .12s ease,border-color .12s ease,opacity .12s ease}',
      '.dsh-cd-btn:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l2)}',
      '.dsh-cd-btn:disabled{opacity:.5;cursor:not-allowed}',
      '.dsh-cd-btn--primary{background:var(--dsh-cd-accent);border-color:transparent;color:var(--dsh-cd-accent-ink)}',
      '.dsh-cd-btn--primary:hover:not(:disabled){background:var(--dsh-cd-accent-strong);border-color:transparent}',
      '.dsh-cd-btn--ghost{background:transparent;border-color:transparent;color:var(--dsw-alias-label-secondary)}',
      '.dsh-cd-btn--ghost:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);border-color:transparent;color:var(--dsw-alias-label-primary)}',
      '.dsh-cd-btn--danger{background:transparent;border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 40%,transparent);color:var(--dsw-alias-state-error-primary)}',
      '.dsh-cd-btn--danger:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent);border-color:var(--dsw-alias-state-error-primary)}',
      '.dsh-cd-iconbtn{display:inline-flex;align-items:center;justify-content:center;width:27px;height:27px;padding:0;border-radius:7px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background .12s ease,color .12s ease}',
      '.dsh-cd-iconbtn:hover{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary)}',
      '.dsh-cd-iconbtn--danger:hover{color:var(--dsw-alias-state-error-primary)}',
      '.dsh-cd-iconbtn svg{display:block}',
      '.dsh-cd-field{display:flex;flex-direction:column;gap:6px;min-width:0}',
      '.dsh-cd-label{font-size:12.5px;font-weight:500;color:var(--dsw-alias-label-secondary)}',
      '.dsh-cd-hint{margin:0;font-size:11.5px;color:var(--dsw-alias-label-secondary)}',
      '.dsh-cd-input{box-sizing:border-box;width:100%;height:36px;padding:0 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13.5px;outline:none;transition:border-color .12s ease,box-shadow .12s ease}',
      '.dsh-cd-input::placeholder{color:var(--dsw-alias-state-idle-primary)}',
      '.dsh-cd-input:focus{border-color:var(--dsh-cd-accent);box-shadow:0 0 0 3px var(--dsh-cd-accent-ring)}',
      'select.dsh-cd-input{cursor:pointer;appearance:auto}',
      'textarea.dsh-cd-input{height:auto;min-height:64px;padding:9px 12px;resize:vertical;font-family:inherit}',
      '.dsh-cd-form{display:flex;flex-direction:column;gap:14px}',
      '.dsh-cd-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
      '.dsh-cd-grid3{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:10px}',
      '.dsh-cd-seg{display:inline-flex;align-self:flex-start;gap:2px;padding:3px;border-radius:9px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2)}',
      '.dsh-cd-seg-btn{height:28px;padding:0 12px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;cursor:pointer}',
      '.dsh-cd-seg-btn.is-on{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:0 1px 3px rgba(0,0,0,.12)}',
      '.dsh-cd-catopts{display:flex;flex-wrap:wrap;gap:6px}',
      '.dsh-cd-catopt{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;cursor:pointer;transition:background .12s ease,border-color .12s ease,color .12s ease}',
      '.dsh-cd-catopt:hover{background:var(--dsw-alias-bg-layer-2)}',
      '.dsh-cd-catopt.is-on{color:var(--dsh-cd-cat);border-color:color-mix(in srgb,var(--dsh-cd-cat) 40%,transparent);background:var(--dsh-cd-cat-soft)}',
      '.dsh-cd-recur{display:flex;flex-wrap:wrap;gap:6px}',
      '.dsh-cd-days{display:flex;flex-wrap:wrap;gap:6px}',
      '.dsh-cd-daychip{height:28px;padding:0 10px;border-radius:7px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}',
      '.dsh-cd-daychip:hover{background:var(--dsw-alias-bg-layer-2)}',
      '.dsh-cd-daychip.is-on{color:var(--dsh-cd-accent);border-color:color-mix(in srgb,var(--dsh-cd-accent) 40%,transparent);background:var(--dsh-cd-accent-soft)}',
      '.dsh-cd-preview{display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-left:3px solid var(--dsh-cd-accent);border-radius:10px;background:var(--dsw-alias-bg-layer-2);font-size:12.5px}',
      '.dsh-cd-preview svg{flex:none;color:var(--dsh-cd-accent)}',
      '.dsh-cd-preview.is-bad{border-left-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}',
      '.dsh-cd-preview.is-bad svg{color:var(--dsw-alias-state-error-primary)}',
      '.dsh-cd-check{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;color:var(--dsw-alias-label-secondary);cursor:pointer}',
      '.dsh-cd-check input{margin:0;accent-color:var(--dsh-cd-accent)}',
      '.dsh-cd-backdrop{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.46);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}',
      '.dsh-cd-modal{display:flex;flex-direction:column;width:100%;max-width:540px;max-height:88vh;overflow:hidden;border:1px solid var(--dsw-alias-border-l1);border-radius:15px;background:var(--dsw-alias-bg-overlay);backdrop-filter:blur(26px) saturate(120%);-webkit-backdrop-filter:blur(26px) saturate(120%);box-shadow:0 24px 64px rgba(0,0,0,.4)}',
      '.dsh-cd-modal--narrow{max-width:430px}',
      '.dsh-cd-modal-head{display:flex;align-items:flex-start;gap:12px;padding:18px 20px 14px;border-bottom:1px solid var(--dsw-alias-border-l1)}',
      '.dsh-cd-modal-titles{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}',
      '.dsh-cd-modal-title{margin:0;font-size:15.5px;font-weight:600}',
      '.dsh-cd-modal-sub{margin:0;font-size:12.5px;color:var(--dsw-alias-label-secondary)}',
      '.dsh-cd-modal-body{display:flex;flex-direction:column;gap:14px;min-height:0;padding:18px 20px;overflow-y:auto}',
      '.dsh-cd-modal-foot{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:14px 20px;border-top:1px solid var(--dsw-alias-border-l1)}',
      '.dsh-cd-settings{display:flex;flex-direction:column;gap:16px}',
      '.dsh-cd-settings-section{display:flex;flex-direction:column;gap:8px}',
      '.dsh-cd-section-label{margin:0;font-size:11.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}',
      '.dsh-cd-switchrow{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}',
      '.dsh-cd-switchtext{display:flex;flex-direction:column;gap:2px;min-width:0}',
      '.dsh-cd-switchlabel{font-size:13px;font-weight:500}',
      '.dsh-cd-switch{display:flex;flex:none;align-items:center;width:38px;height:22px;padding:2px;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-alias-bg-layer-2);cursor:pointer;transition:background .14s ease,border-color .14s ease}',
      '.dsh-cd-switch.is-on{background:var(--dsh-cd-accent);border-color:transparent}',
      '.dsh-cd-switch-thumb{display:block;width:16px;height:16px;border-radius:999px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .14s ease}',
      '.dsh-cd-switch.is-on .dsh-cd-switch-thumb{transform:translateX(16px)}',
      '.dsh-cd-btnrow{display:flex;gap:8px;flex-wrap:wrap}',
      '.dsh-cd-kv{display:flex;align-items:baseline;justify-content:space-between;gap:16px;font-size:12.5px}',
      '.dsh-cd-kv span:first-child{color:var(--dsw-alias-label-secondary)}',
      '.dsh-cd-kv span:last-child{text-align:right}',
      '.dsh-cd-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:90;max-width:min(92vw,520px);padding:9px 14px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-overlay);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);color:var(--dsw-alias-label-primary);font-size:12.5px;box-shadow:0 12px 32px rgba(0,0,0,.28)}',
      '.dsh-cd-footnote{margin:0;font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.dsh-cd-card[data-cat="birthday"],.dsh-cd-hero[data-cat="birthday"],.dsh-cd-chip[data-cat="birthday"],.dsh-cd-catopt[data-cat="birthday"]{--dsh-cd-cat:#e75c8c;--dsh-cd-cat-soft:rgba(231,92,140,.14)}',
      '.dsh-cd-card[data-cat="anniversary"],.dsh-cd-hero[data-cat="anniversary"],.dsh-cd-chip[data-cat="anniversary"],.dsh-cd-catopt[data-cat="anniversary"]{--dsh-cd-cat:#a45ce0;--dsh-cd-cat-soft:rgba(164,92,224,.14)}',
      '.dsh-cd-card[data-cat="important"],.dsh-cd-hero[data-cat="important"],.dsh-cd-chip[data-cat="important"],.dsh-cd-catopt[data-cat="important"]{--dsh-cd-cat:#d99a2b;--dsh-cd-cat-soft:rgba(217,154,43,.15)}',
      '.dsh-cd-card[data-cat="loan"],.dsh-cd-hero[data-cat="loan"],.dsh-cd-chip[data-cat="loan"],.dsh-cd-catopt[data-cat="loan"]{--dsh-cd-cat:#2ea58c;--dsh-cd-cat-soft:rgba(46,165,140,.15)}',
      '.dsh-cd-card[data-cat="creditcard"],.dsh-cd-hero[data-cat="creditcard"],.dsh-cd-chip[data-cat="creditcard"],.dsh-cd-catopt[data-cat="creditcard"]{--dsh-cd-cat:#4a86e8;--dsh-cd-cat-soft:rgba(74,134,232,.15)}',
      '.dsh-cd-card[data-cat="custom"],.dsh-cd-hero[data-cat="custom"],.dsh-cd-chip[data-cat="custom"],.dsh-cd-catopt[data-cat="custom"]{--dsh-cd-cat:#7a8496;--dsh-cd-cat-soft:rgba(122,132,150,.15)}',
      '@media (prefers-reduced-motion:reduce){.dsh-cd-card,.dsh-cd-switch,.dsh-cd-switch-thumb{transition:none}.dsh-cd-card:hover{transform:none}}',
      '@media (max-width:720px){.dsh-cd-head{padding:14px 16px}.dsh-cd-column{padding:16px 16px 40px}.dsh-cd-hero{flex-wrap:wrap;padding:16px}.dsh-cd-hero-num{font-size:44px}.dsh-cd-grid2,.dsh-cd-grid3{grid-template-columns:1fr}.dsh-cd-modal{max-height:92vh}.dsh-cd-card-actions{opacity:1}}',
    ].join('\n');

    /* ------------------------------------------------------------------ */
    /* LUNAR-CORE:BEGIN                                                   */
    /* Solar/lunar calendar math and recurrence resolution. Kept free of  */
    /* React and locale state so it can be unit-tested from Node.         */
    /* ------------------------------------------------------------------ */

    const LUNAR_MONTH_NAMES = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
    const LUNAR_DAY_DIGITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

    function pad2(value) {
      return String(value).padStart(2, '0');
    }

    function startOfDay(date) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function noon(date) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
    }

    function dateKey(date) {
      return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
    }

    function dayDiff(a, b) {
      const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
      const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
      return Math.round((ua - ub) / MS_DAY);
    }

    function daysInMonth(year, month) {
      return new Date(year, month, 0).getDate();
    }

    function lunarDayName(day) {
      if (day === 10) return '初十';
      if (day < 10) return '初' + LUNAR_DAY_DIGITS[day];
      if (day < 20) return '十' + LUNAR_DAY_DIGITS[day - 10];
      if (day === 20) return '二十';
      if (day < 30) return '廿' + LUNAR_DAY_DIGITS[day - 20];
      if (day === 30) return '三十';
      return String(day);
    }

    const lunarFormatter = (function () {
      try {
        const formatter = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        return formatter.resolvedOptions().calendar === 'chinese' ? formatter : null;
      } catch (err) {
        return null;
      }
    })();
    const lunarPartsCache = new Map();
    const lunarToSolarCache = new Map();
    const leapMonthCache = new Map();

    function lunarPartsOf(date) {
      if (!lunarFormatter) return null;
      const key = dateKey(date);
      const cached = lunarPartsCache.get(key);
      if (cached !== undefined) return cached;
      let result = null;
      try {
        const parts = lunarFormatter.formatToParts(noon(date));
        let relatedYear = null;
        let yearName = '';
        let monthRaw = '';
        let dayNumber = 0;
        for (let i = 0; i < parts.length; i += 1) {
          const part = parts[i];
          if (part.type === 'relatedYear') relatedYear = Number(part.value);
          else if (part.type === 'yearName') yearName = part.value;
          else if (part.type === 'month') monthRaw = part.value;
          else if (part.type === 'day') dayNumber = Number(String(part.value).replace(/[^\d]/g, ''));
        }
        if (relatedYear && monthRaw && dayNumber >= 1 && dayNumber <= 30) {
          const leap = /^闰/.test(monthRaw);
          const clean = monthRaw.replace(/^闰/, '');
          let month = 0;
          if (clean === '正月') month = 1;
          else if (clean === '冬月' || clean === '十一月') month = 11;
          else if (clean === '腊月' || clean === '十二月') month = 12;
          else {
            const index = LUNAR_MONTH_NAMES.indexOf(clean);
            if (index >= 0) month = index + 1;
            else {
              const match = clean.match(/^(\d{1,2})月?$/);
              if (match) month = Number(match[1]);
            }
          }
          if (month >= 1 && month <= 12) {
            result = {
              year: relatedYear,
              yearName: yearName,
              month: month,
              day: dayNumber,
              leap: leap,
            };
          }
        }
      } catch (err) {
        result = null;
      }
      if (lunarPartsCache.size > 60000) lunarPartsCache.clear();
      lunarPartsCache.set(key, result);
      return result;
    }

    // Some ICU builds accept the calendar but omit expected parts or leap-month markers.
    const lunarProbe = lunarPartsOf(new Date(2024, 1, 10, 12));
    const lunarLeapProbe = lunarPartsOf(new Date(2023, 2, 22, 12));
    const lunarSupported = !!lunarProbe && lunarProbe.year === 2024 &&
      lunarProbe.month === 1 && lunarProbe.day === 1 && !lunarProbe.leap &&
      !!lunarLeapProbe && lunarLeapProbe.year === 2023 && lunarLeapProbe.month === 2 &&
      lunarLeapProbe.day === 1 && lunarLeapProbe.leap;

    function lunarToSolar(year, month, day, leap) {
      if (!lunarSupported) return null;
      if (!(year >= 1900 && year <= 2100) || month < 1 || month > 12 || day < 1 || day > 30) return null;
      const key = year + '|' + month + '|' + day + '|' + (leap ? 1 : 0);
      const cached = lunarToSolarCache.get(key);
      if (cached !== undefined) return cached;
      const start = new Date(year, 0, 1, 12);
      const end = new Date(year + 1, 2, 10, 12);
      let found = null;
      for (let date = start; date <= end; date = addDays(date, 1)) {
        const parts = lunarPartsOf(date);
        if (!parts) continue;
        if (parts.year > year) break;
        if (parts.year === year && parts.month === month && parts.day === day && parts.leap === !!leap) {
          found = startOfDay(date);
          break;
        }
      }
      lunarToSolarCache.set(key, found);
      return found;
    }

    function lunarDateOf(year, month, day, leap) {
      const clamped = Math.min(30, Math.max(1, day));
      const exact = lunarToSolar(year, month, clamped, leap);
      if (exact) return exact;
      if (clamped === 30) return lunarToSolar(year, month, 29, leap);
      return null;
    }

    function lunarYearLeapMonth(year) {
      if (!lunarSupported) return 0;
      if (leapMonthCache.has(year)) return leapMonthCache.get(year);
      let result = 0;
      const start = new Date(year, 0, 1, 12);
      const end = new Date(year + 1, 2, 10, 12);
      for (let date = start; date <= end; date = addDays(date, 1)) {
        const parts = lunarPartsOf(date);
        if (!parts) continue;
        if (parts.year > year) break;
        if (parts.year === year && parts.leap) {
          result = parts.month;
          break;
        }
      }
      leapMonthCache.set(year, result);
      return result;
    }

    function addDays(date, offset) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset, 12);
    }

    function parseSolarInput(value) {
      const match = String(value || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (!match) return null;
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
      return { year: year, month: month, day: day };
    }

    function solarInput(date) {
      return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
    }

    function solarOccurrence(event, today) {
      const base = event.solar;
      if (!base) return null;
      const recurrence = event.recurrence;
      if (recurrence === 'once') {
        const date = new Date(base.year, base.month - 1, base.day);
        return { date: date, daysUntil: dayDiff(date, today) };
      }
      if (recurrence === 'weekly') {
        const anchor = new Date(base.year, base.month - 1, base.day);
        const offset = (anchor.getDay() - today.getDay() + 7) % 7;
        return { date: addDays(today, offset), daysUntil: offset };
      }
      if (recurrence === 'monthly') {
        for (let k = 0; k < 24; k += 1) {
          const first = new Date(today.getFullYear(), today.getMonth() + k, 1, 12);
          const day = Math.min(base.day, daysInMonth(first.getFullYear(), first.getMonth() + 1));
          const candidate = new Date(first.getFullYear(), first.getMonth(), day);
          const diff = dayDiff(candidate, today);
          if (diff >= 0) return { date: candidate, daysUntil: diff };
        }
        return null;
      }
      for (let year = today.getFullYear(); year <= today.getFullYear() + 2; year += 1) {
        const day = Math.min(base.day, daysInMonth(year, base.month));
        const candidate = new Date(year, base.month - 1, day);
        const diff = dayDiff(candidate, today);
        if (diff >= 0) return { date: candidate, daysUntil: diff };
      }
      return null;
    }

    function lunarOccurrence(event, today) {
      const base = event.lunar;
      if (!base) return null;
      if (event.recurrence === 'once') {
        const date = lunarDateOf(base.year, base.month, base.day, base.leap);
        if (!date) return null;
        return { date: date, daysUntil: dayDiff(date, today) };
      }
      const todayLunar = lunarPartsOf(today);
      if (!todayLunar) return null;
      for (let year = todayLunar.year; year <= todayLunar.year + 3; year += 1) {
        let date = lunarDateOf(year, base.month, base.day, base.leap);
        if (!date && base.leap) date = lunarDateOf(year, base.month, base.day, false);
        if (!date) continue;
        const diff = dayDiff(date, today);
        if (diff >= 0) return { date: date, daysUntil: diff };
      }
      return null;
    }

    function occurrenceFor(event, today) {
      if (!event || !event.dateType) return null;
      const day = startOfDay(today || new Date());
      if (event.dateType === 'lunar') return lunarOccurrence(event, day);
      return solarOccurrence(event, day);
    }

    /* ------------------------------------------------------------------ */
    /* LUNAR-CORE:END                                                     */
    /* ------------------------------------------------------------------ */

    /* ------------------------------------------------------------------ */
    /* Storage                                                            */
    /* ------------------------------------------------------------------ */

    const DEFAULT_SETTINGS = {
      notifications: true,
      defaultReminderTime: '09:00',
      fired: {},
    };

    function storageAvailable() {
      try {
        const probe = '__dsh_cd_probe__' + Date.now().toString(36) + Math.random().toString(36).slice(2);
        if (window.localStorage.getItem(probe) !== null) return false;
        window.localStorage.setItem(probe, '1');
        if (window.localStorage.getItem(probe) !== '1') return false;
        window.localStorage.removeItem(probe);
        return true;
      } catch (err) {
        return false;
      }
    }

    function uid() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function sanitizeEvent(raw) {
      if (!raw || typeof raw !== 'object') return null;
      const title = String(raw.title || '').trim();
      if (!title) return null;
      const dateType = raw.dateType === 'lunar' ? 'lunar' : 'solar';
      const category = CATEGORIES.indexOf(raw.category) >= 0 ? raw.category : 'custom';
      let recurrence = RECURRENCES.indexOf(raw.recurrence) >= 0 ? raw.recurrence : 'yearly';
      if (dateType === 'lunar' && (recurrence === 'monthly' || recurrence === 'weekly')) recurrence = 'yearly';
      const now = Date.now();
      const event = {
        id: typeof raw.id === 'string' && raw.id ? raw.id : uid(),
        title: title.slice(0, 80),
        category: category,
        dateType: dateType,
        recurrence: recurrence,
        note: typeof raw.note === 'string' ? raw.note.slice(0, 500) : '',
        pinned: !!raw.pinned,
        reminderDays: [],
        reminderTime: '09:00',
        createdAt: Number(raw.createdAt) || now,
        updatedAt: Number(raw.updatedAt) || now,
      };
      if (dateType === 'solar') {
        const solar = raw.solar || {};
        const year = Number(solar.year);
        const month = Number(solar.month);
        const day = Number(solar.day);
        if (!(year >= 1900 && year <= 2100) || !(month >= 1 && month <= 12) || !(day >= 1)) return null;
        if (day > daysInMonth(year, month)) return null;
        event.solar = { year: year, month: month, day: day };
      } else {
        const lunar = raw.lunar || {};
        const year = Number(lunar.year);
        const month = Number(lunar.month);
        const day = Number(lunar.day);
        if (!(year >= 1900 && year <= 2100) || !(month >= 1 && month <= 12) || !(day >= 1 && day <= 30)) return null;
        const leap = !!lunar.leap;
        if (leap && lunarYearLeapMonth(year) !== month) return null;
        if (!lunarDateOf(year, month, day, leap)) return null;
        event.lunar = { year: year, month: month, day: day, leap: leap };
      }
      if (Array.isArray(raw.reminderDays)) {
        const seen = {};
        raw.reminderDays.forEach(function (value) {
          const n = Number(value);
          if (Number.isInteger(n) && n >= 0 && n <= 365 && !seen[n]) {
            seen[n] = true;
            event.reminderDays.push(n);
          }
        });
        event.reminderDays.sort(function (a, b) {
          return a - b;
        });
      } else {
        event.reminderDays = [0, 1, 3];
      }
      if (typeof raw.reminderTime === 'string' && /^\d{2}:\d{2}$/.test(raw.reminderTime)) {
        event.reminderTime = raw.reminderTime;
      }
      return event;
    }

    function decodeEvents(data) {
      if (!Array.isArray(data)) {
        if (!data || typeof data !== 'object' || !Array.isArray(data.events)) return null;
        if (data.schema !== undefined && data.schema !== SCHEMA) return null;
        if (data.version !== undefined && data.version !== STORE_VERSION && data.version !== 0) return null;
        if (Object.keys(data).some(function (key) {
          return ['schema', 'version', 'events', 'exportedAt'].indexOf(key) < 0;
        })) return null;
      }
      const list = Array.isArray(data) ? data : data.events;
      if (list.length > MAX_EVENTS) return null;
      const events = [];
      const ids = new Set();
      for (const item of list) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
        const event = sanitizeEvent(item);
        if (!event) return null;
        const date = event.dateType === 'lunar' ? event.lunar : event.solar;
        if (!Number.isInteger(date.year) || !Number.isInteger(date.month) || !Number.isInteger(date.day)) return null;
        if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(event.reminderTime)) return null;
        // Legacy missing fields may receive defaults, but supplied data must not
        // be dropped, truncated, coerced, or silently corrected.
        for (const key of Object.keys(item)) {
          if (!Object.prototype.hasOwnProperty.call(event, key)) return null;
          if (key === 'solar' || key === 'lunar') {
            const date = item[key];
            if (!date || typeof date !== 'object' || Array.isArray(date)) return null;
            for (const part of Object.keys(date)) {
              if (!Object.prototype.hasOwnProperty.call(event[key], part) || date[part] !== event[key][part]) return null;
            }
          } else if (key === 'reminderDays') {
            if (!Array.isArray(item[key]) || item[key].length !== event[key].length ||
                item[key].some(function (value) { return event[key].indexOf(value) < 0; })) return null;
          } else if (item[key] !== event[key]) return null;
        }
        if (ids.has(event.id)) return null;
        ids.add(event.id);
        events.push(event);
      }
      return events;
    }

    // Only a panel-owned snapshot authorizes writes; background reads are independent.
    function loadState(snapshot) {
      const empty = { schema: SCHEMA, version: STORE_VERSION, events: [] };
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const events = raw === null ? [] : decodeEvents(JSON.parse(raw));
        if (!events) throw new Error('Invalid countdown store');
        if (snapshot) { snapshot.raw = raw; snapshot.locked = false; }
        return { schema: SCHEMA, version: STORE_VERSION, events: events };
      } catch (err) {
        if (snapshot) snapshot.locked = true;
        return empty;
      }
    }

    function snapshotIsCurrent(snapshot) {
      try {
        return !!snapshot && !snapshot.locked && window.localStorage.getItem(STORAGE_KEY) === snapshot.raw;
      } catch (err) {
        return false;
      }
    }

    function saveState(state, snapshot) {
      try {
        if (!snapshotIsCurrent(snapshot) || !decodeEvents(state.events)) return false;
        const raw = JSON.stringify({ schema: SCHEMA, version: STORE_VERSION, events: state.events });
        window.localStorage.setItem(STORAGE_KEY, raw);
        snapshot.raw = raw;
        return true;
      } catch (err) {
        return false;
      }
    }

    let settingsSnapshot;
    let settingsLocked = true;

    function decodeSettings(value) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
      if (Object.keys(value).some(function (key) {
        return ['notifications', 'defaultReminderTime', 'fired'].indexOf(key) < 0;
      })) return null;
      if ('notifications' in value && typeof value.notifications !== 'boolean') return null;
      if ('defaultReminderTime' in value && (typeof value.defaultReminderTime !== 'string' ||
          !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.defaultReminderTime))) return null;
      if ('fired' in value) {
        if (!value.fired || typeof value.fired !== 'object' || Array.isArray(value.fired)) return null;
        if (Object.keys(value.fired).some(function (key) {
          return typeof value.fired[key] !== 'number' || !Number.isFinite(value.fired[key]) || value.fired[key] <= 0;
        })) return null;
      }
      return Object.assign({}, DEFAULT_SETTINGS, value);
    }

    function loadSettings() {
      try {
        const raw = window.localStorage.getItem(SETTINGS_KEY);
        const settings = raw === null ? Object.assign({}, DEFAULT_SETTINGS) : decodeSettings(JSON.parse(raw));
        if (!settings) throw new Error('Invalid countdown settings');
        settingsSnapshot = raw;
        settingsLocked = false;
        return settings;
      } catch (err) {
        settingsLocked = true;
        // Unknown preferences must not enable notifications or overwrite original data.
        return Object.assign({}, DEFAULT_SETTINGS, { notifications: false });
      }
    }

    function saveSettings(settings) {
      try {
        if (settingsLocked || !decodeSettings(settings) ||
            window.localStorage.getItem(SETTINGS_KEY) !== settingsSnapshot) return false;
        const raw = JSON.stringify(settings);
        window.localStorage.setItem(SETTINGS_KEY, raw);
        settingsSnapshot = raw;
        return true;
      } catch (err) {
        return false;
      }
    }

    function pruneFired(fired, now) {
      const result = Object.create(null);
      Object.keys(fired || {}).forEach(function (key) {
        const value = Number(fired[key]);
        if (value && now.getTime() - value < 30 * MS_DAY) result[key] = value;
      });
      return result;
    }

    /* ------------------------------------------------------------------ */
    /* Locale helpers                                                     */
    /* ------------------------------------------------------------------ */

    function localeOf(ctx) {
      try {
        return ctx && ctx.get ? ctx.get('locale') : null;
      } catch (err) {
        return null;
      }
    }

    function activeLanguage(ctx) {
      try {
        const locale = localeOf(ctx);
        const snapshot = locale && locale.getLocale ? locale.getLocale() : null;
        const id = snapshot && snapshot.active ? String(snapshot.active) : '';
        if (id) return id.toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en';
      } catch (err) {
        /* fall through to navigator language */
      }
      try {
        return String(navigator.language || '').toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en';
      } catch (err) {
        return 'en';
      }
    }

    function translate(ctx, key, vars) {
      let text;
      const locale = localeOf(ctx);
      if (locale && typeof locale.bind === 'function') {
        try {
          const bound = locale.bind(NS);
          const value = bound(key);
          if (typeof value === 'string' && value && value !== key) text = value;
        } catch (err) {
          text = undefined;
        }
      }
      if (text === undefined) {
        const table = activeLanguage(ctx) === 'zh' ? ZH : EN;
        text = Object.prototype.hasOwnProperty.call(table, key) ? table[key] : EN[key];
      }
      if (text === undefined) return key;
      if (vars) {
        text = text.replace(/\{(\w+)\}/g, function (match, name) {
          return vars[name] === undefined ? match : String(vars[name]);
        });
      }
      return text;
    }

    /* ------------------------------------------------------------------ */
    /* Formatting helpers                                                 */
    /* ------------------------------------------------------------------ */

    function T(key, vars) {
      return translate(Bridge.ctx, key, vars);
    }

    function ordinal(value) {
      const n = Number(value);
      const mod100 = n % 100;
      if (mod100 >= 11 && mod100 <= 13) return n + 'th';
      if (n % 10 === 1) return n + 'st';
      if (n % 10 === 2) return n + 'nd';
      if (n % 10 === 3) return n + 'rd';
      return n + 'th';
    }

    function formatSolarDate(date, withYear) {
      if (!date) return '—';
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      if (activeLanguage(Bridge.ctx) === 'zh') {
        return (withYear ? year + '年' : '') + month + '月' + day + '日';
      }
      return (withYear ? year + ' ' : '') + EN_MONTHS[date.getMonth()] + ' ' + day;
    }

    function weekdayShort(date) {
      return T('weekday.' + date.getDay());
    }

    function lunarLabel(month, day, leap) {
      if (activeLanguage(Bridge.ctx) === 'zh') {
        return (leap ? '闰' : '') + LUNAR_MONTH_NAMES[month - 1] + lunarDayName(day);
      }
      return (leap ? 'Leap ' : '') + ordinal(month) + ' month, ' + ordinal(day) + ' day';
    }

    function lunarPrefix() {
      return activeLanguage(Bridge.ctx) === 'zh' ? '农历' : 'Lunar ';
    }

    function lunarTextOfDate(date) {
      const parts = lunarPartsOf(date);
      if (!parts) return '';
      return lunarPrefix() + lunarLabel(parts.month, parts.day, parts.leap);
    }

    function mainDateText(event) {
      if (event.dateType === 'lunar') {
        const label = lunarPrefix() + lunarLabel(event.lunar.month, event.lunar.day, event.lunar.leap);
        if (event.recurrence === 'yearly') return T('recur.yearly') + ' · ' + label;
        return event.lunar.year + '年 · ' + label;
      }
      const base = event.solar;
      const anchor = new Date(base.year, base.month - 1, base.day);
      if (event.recurrence === 'yearly') return T('recur.yearly') + ' · ' + formatSolarDate(anchor, false);
      if (event.recurrence === 'monthly') {
        return T('recur.monthly') + ' · ' + (activeLanguage(Bridge.ctx) === 'zh' ? base.day + '日' : 'day ' + base.day);
      }
      if (event.recurrence === 'weekly') return T('recur.weekly') + ' · ' + weekdayShort(anchor);
      return formatSolarDate(anchor, true);
    }

    function subDateText(event, occurrence) {
      if (!occurrence) return '';
      if (event.dateType === 'lunar') {
        return T('list.next') + ' ' + formatSolarDate(occurrence.date, true) + ' ' + weekdayShort(occurrence.date);
      }
      const lunar = lunarTextOfDate(occurrence.date);
      return lunar || formatSolarDate(occurrence.date, true) + ' ' + weekdayShort(occurrence.date);
    }

    function reminderSummary(event) {
      const days = Array.isArray(event.reminderDays) ? event.reminderDays.slice().sort(function (a, b) {
        return a - b;
      }) : [];
      return days
        .map(function (day) {
          if (day === 0) return T('editor.sameDay');
          return T('editor.daysBefore', { n: day });
        })
        .join('、');
    }

    /* ------------------------------------------------------------------ */
    /* Icons                                                              */
    /* ------------------------------------------------------------------ */

    function svg(paths, size) {
      const box = size || 16;
      return h(
        'svg',
        {
          width: box,
          height: box,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.8,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
        },
        paths.map(function (item, index) {
          return h(item[0], Object.assign({ key: index }, item[1]));
        }),
      );
    }

    function calendarIcon(size) {
      return svg(
        [
          ['rect', { x: 3, y: 4, width: 18, height: 17, rx: 2 }],
          ['path', { d: 'M16 2v4M8 2v4M3 10h18' }],
        ],
        size,
      );
    }
    function bellIcon(size) {
      return svg(
        [
          ['path', { d: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' }],
          ['path', { d: 'M13.73 21a2 2 0 0 1-3.46 0' }],
        ],
        size,
      );
    }
    function gearIcon(size) {
      return svg(
        [
          ['circle', { cx: 12, cy: 12, r: 3 }],
          ['path', { d: 'M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8.9 4.6 1.7 1.7 0 0 0 10 3.05V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z' }],
        ],
        size,
      );
    }
    function plusIcon(size) {
      return svg([['path', { d: 'M12 5v14M5 12h14' }]], size);
    }
    function searchIcon(size) {
      return svg(
        [
          ['circle', { cx: 11, cy: 11, r: 7.5 }],
          ['path', { d: 'M21 21l-4.35-4.35' }],
        ],
        size,
      );
    }
    function pinIcon(size) {
      return svg(
        [
          ['path', { d: 'M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z' }],
          ['path', { d: 'M12 17v5' }],
        ],
        size,
      );
    }
    function editIcon(size) {
      return svg(
        [
          ['path', { d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' }],
          ['path', { d: 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' }],
        ],
        size,
      );
    }
    function trashIcon(size) {
      return svg(
        [
          ['path', { d: 'M3 6h18' }],
          ['path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6' }],
          ['path', { d: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }],
        ],
        size,
      );
    }
    function closeIcon(size) {
      return svg([['path', { d: 'M18 6L6 18M6 6l12 12' }]], size);
    }
    function checkIcon(size) {
      return svg([['path', { d: 'M20 6L9 17l-5-5' }]], size);
    }
    function cakeIcon(size) {
      return svg(
        [
          ['path', { d: 'M4 21h16' }],
          ['path', { d: 'M5 21v-8h14v8' }],
          ['path', { d: 'M8 13V9M12 13V9M16 13V9' }],
          ['path', { d: 'M8 6.2c.6-.7.6-1.4 0-2.2M12 6.2c.6-.7.6-1.4 0-2.2M16 6.2c.6-.7.6-1.4 0-2.2' }],
        ],
        size,
      );
    }
    function heartIcon(size) {
      return svg([['path', { d: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' }]], size);
    }
    function starIcon(size) {
      return svg([['path', { d: 'M12 2.5l2.94 5.95 6.56.95-4.75 4.63 1.12 6.54L12 17.48l-5.87 3.09 1.12-6.54L2.5 9.4l6.56-.95L12 2.5z' }]], size);
    }
    function bankIcon(size) {
      return svg(
        [
          ['path', { d: 'M3 21h18' }],
          ['path', { d: 'M12 3l9 7H3l9-7z' }],
          ['path', { d: 'M5 10v11M9 10v11M15 10v11M19 10v11' }],
        ],
        size,
      );
    }
    function cardIcon(size) {
      return svg(
        [
          ['rect', { x: 2, y: 5, width: 20, height: 14, rx: 2 }],
          ['path', { d: 'M2 10h20' }],
        ],
        size,
      );
    }
    function tagIcon(size) {
      return svg(
        [
          ['path', { d: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z' }],
          ['circle', { cx: 7, cy: 7, r: 1.2 }],
        ],
        size,
      );
    }
    function downloadIcon(size) {
      return svg(
        [
          ['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }],
          ['path', { d: 'M7 10l5 5 5-5' }],
          ['path', { d: 'M12 15V3' }],
        ],
        size,
      );
    }
    function uploadIcon(size) {
      return svg(
        [
          ['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }],
          ['path', { d: 'M17 8l-5-5-5 5' }],
          ['path', { d: 'M12 3v12' }],
        ],
        size,
      );
    }
    function bellOffIcon(size) {
      return svg(
        [
          ['path', { d: 'M13.73 21a2 2 0 0 1-3.46 0' }],
          ['path', { d: 'M18.63 13A17.9 17.9 0 0 0 18 8' }],
          ['path', { d: 'M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14' }],
          ['path', { d: 'M18 8a6 6 0 0 0-9.33-5' }],
          ['path', { d: 'M1 1l22 22' }],
        ],
        size,
      );
    }

    const CATEGORY_ICONS = {
      birthday: cakeIcon,
      anniversary: heartIcon,
      important: starIcon,
      loan: bankIcon,
      creditcard: cardIcon,
      custom: tagIcon,
    };

    /* ------------------------------------------------------------------ */
    /* Shared UI                                                          */
    /* ------------------------------------------------------------------ */

    const Bridge = { ctx: null };

    function insertStyles() {
      if (typeof document === 'undefined' || !document.head) return function () {};
      const id = 'dsh-cd-styles';
      const existing = document.getElementById(id);
      const el = existing || document.createElement('style');
      el.id = id;
      if (el.textContent !== CSS) el.textContent = CSS;
      if (!existing) document.head.appendChild(el);
      return function () {
        if (!existing && el.parentNode) el.parentNode.removeChild(el);
      };
    }

    function Modal(props) {
      const onClose = props.onClose;
      useEffect(
        function () {
          function onKey(event) {
            if (event.key === 'Escape') {
              event.stopPropagation();
              onClose();
            }
          }
          window.addEventListener('keydown', onKey, true);
          return function () {
            window.removeEventListener('keydown', onKey, true);
          };
        },
        [onClose],
      );
      return h(
        'div',
        {
          className: 'dsh-cd-backdrop',
          onMouseDown: function (event) {
            if (event.target === event.currentTarget) onClose();
          },
        },
        h(
          'div',
          {
            className: 'dsh-cd-modal' + (props.narrow ? ' dsh-cd-modal--narrow' : ''),
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': props.title,
          },
          h(
            'div',
            { className: 'dsh-cd-modal-head' },
            h(
              'div',
              { className: 'dsh-cd-modal-titles' },
              h('h2', { className: 'dsh-cd-modal-title' }, props.title),
              props.subtitle ? h('p', { className: 'dsh-cd-modal-sub' }, props.subtitle) : null,
            ),
            h(
              'button',
              { type: 'button', className: 'dsh-cd-iconbtn', onClick: onClose, 'aria-label': T('action.close') },
              closeIcon(16),
            ),
          ),
          h('div', { className: 'dsh-cd-modal-body' }, props.children),
          props.footer ? h('div', { className: 'dsh-cd-modal-foot' }, props.footer) : null,
        ),
      );
    }

    function Field(props) {
      return h(
        'div',
        { className: 'dsh-cd-field' },
        h('span', { className: 'dsh-cd-label' }, props.label),
        props.children,
        props.hint ? h('span', { className: 'dsh-cd-hint' }, props.hint) : null,
      );
    }

    function Switch(props) {
      return h(
        'div',
        { className: 'dsh-cd-switchrow' },
        h(
          'div',
          { className: 'dsh-cd-switchtext' },
          h('span', { className: 'dsh-cd-switchlabel' }, props.label),
          props.desc ? h('span', { className: 'dsh-cd-hint' }, props.desc) : null,
        ),
        h(
          'button',
          {
            type: 'button',
            role: 'switch',
            'aria-checked': props.checked ? 'true' : 'false',
            'aria-label': props.label,
            className: 'dsh-cd-switch' + (props.checked ? ' is-on' : ''),
            onClick: function () {
              props.onChange(!props.checked);
            },
          },
          h('span', { className: 'dsh-cd-switch-thumb' }),
        ),
      );
    }

    function CategoryTag(props) {
      const Icon = CATEGORY_ICONS[props.category] || CATEGORY_ICONS.custom;
      return h('span', { className: 'dsh-cd-tag' }, Icon(12), T('cat.' + props.category));
    }

    /* ------------------------------------------------------------------ */
    /* Reminder engine (page level, works while the panel is closed)      */
    /* ------------------------------------------------------------------ */

    function computeDueReminders(events, settings, now) {
      const due = [];
      if (!settings || settings.notifications === false) return due;
      const hhmm = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
      const fired = settings.fired && typeof settings.fired === 'object' ? settings.fired : {};
      events.forEach(function (event) {
        const days = Array.isArray(event.reminderDays) ? event.reminderDays : [];
        if (!days.length) return;
        const occurrence = occurrenceFor(event, now);
        if (!occurrence) return;
        const diff = occurrence.daysUntil;
        if (diff < 0 || days.indexOf(diff) < 0) return;
        const time = event.reminderTime || settings.defaultReminderTime || '09:00';
        if (hhmm < time) return;
        const key = event.id + '|' + dateKey(occurrence.date) + '|' + diff;
        if (fired[key]) return;
        due.push({ key: key, event: event, occurrence: occurrence });
      });
      return due;
    }

    function fireReminders(items, now) {
      if (!items.length) return;
      const settings = loadSettings();
      if (settingsLocked || !settings.notifications) return;
      const fired = Object.fromEntries(Object.entries(settings.fired || {}));
      items = items.filter(function (item) { return !Object.prototype.hasOwnProperty.call(fired, item.key); });
      if (!items.length) return;
      items.forEach(function (item) {
        fired[item.key] = now.getTime();
      });
      if (!saveSettings(Object.assign({}, settings, { fired: pruneFired(fired, now) }))) return;
      const body = items
        .map(function (item) {
          const when =
            item.occurrence.daysUntil === 0
              ? T('reminder.today')
              : T('reminder.inDays', { n: item.occurrence.daysUntil });
          return item.event.title + ' · ' + when;
        })
        .join('\n');
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const notice = new Notification(T('reminder.title'), {
            body: body,
            tag: 'dsh-countdown-' + dateKey(now),
          });
          notice.onclick = function () {
            try {
              window.focus();
            } catch (err) {
              /* focusing may be blocked */
            }
          };
        }
      } catch (err) {
        /* the in-app toast below still fires */
      }
      try {
        window.dispatchEvent(
          new CustomEvent('dsh-countdown:notify', {
            detail: {
              items: items.map(function (item) {
                return { id: item.event.id, title: item.event.title, days: item.occurrence.daysUntil };
              }),
            },
          }),
        );
      } catch (err) {
        /* ignore */
      }
    }

    /* ------------------------------------------------------------------ */
    /* Cards                                                              */
    /* ------------------------------------------------------------------ */

    function EventCard(props) {
      const item = props.item;
      const event = item.event;
      const occurrence = item.occurrence;
      const past = occurrence.daysUntil < 0;
      const amount = Math.abs(occurrence.daysUntil);
      const isToday = occurrence.daysUntil === 0;
      return h(
        'article',
        { className: 'dsh-cd-card' + (past ? ' dsh-cd-card--past' : ''), 'data-cat': event.category },
        h(
          'div',
          { className: 'dsh-cd-card-top' },
          CategoryTag({ category: event.category }),
          h(
            'div',
            { className: 'dsh-cd-card-actions' },
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-cd-iconbtn',
                title: T(event.pinned ? 'action.unpin' : 'action.pin'),
                'aria-label': T(event.pinned ? 'action.unpin' : 'action.pin'),
                onClick: function () {
                  props.onTogglePin(event);
                },
              },
              pinIcon(13),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-cd-iconbtn',
                title: T('action.edit'),
                'aria-label': T('action.edit'),
                onClick: function () {
                  props.onEdit(event);
                },
              },
              editIcon(13),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-cd-iconbtn dsh-cd-iconbtn--danger',
                title: T('action.delete'),
                'aria-label': T('action.delete'),
                onClick: function () {
                  props.onDelete(event);
                },
              },
              trashIcon(13),
            ),
          ),
        ),
        h('h3', { className: 'dsh-cd-card-title', title: event.title }, event.title),
        h(
          'div',
          { className: 'dsh-cd-card-dday' },
          h(
            'span',
            { className: 'dsh-cd-card-num' + (isToday ? ' dsh-cd-card-num--text' : '') },
            isToday ? T('list.today') : String(amount),
          ),
          h(
            'span',
            { className: 'dsh-cd-card-unit' },
            isToday ? T('list.todayHint') : occurrence.daysUntil > 0 ? T('list.daysAfter') : T('list.daysPast'),
          ),
        ),
        h('div', { className: 'dsh-cd-card-date' }, mainDateText(event)),
        h('div', { className: 'dsh-cd-card-sub' }, subDateText(event, occurrence)),
        event.reminderDays.length || event.pinned
          ? h(
              'div',
              { className: 'dsh-cd-card-foot' },
              event.reminderDays.length
                ? h(
                    'span',
                    { className: 'dsh-cd-tag dsh-cd-tag--plain', title: reminderSummary(event) },
                    bellIcon(11),
                    T('card.reminder'),
                  )
                : null,
              event.pinned
                ? h('span', { className: 'dsh-cd-tag dsh-cd-tag--plain' }, pinIcon(11), T('card.pinned'))
                : null,
            )
          : null,
      );
    }

    function HeroCard(props) {
      const item = props.item;
      const event = item.event;
      const occurrence = item.occurrence;
      const isToday = occurrence.daysUntil === 0;
      return h(
        'section',
        { className: 'dsh-cd-hero', 'data-cat': event.category },
        h(
          'div',
          { className: 'dsh-cd-hero-main' },
          h('span', { className: 'dsh-cd-hero-label' }, T('list.heroLabel') + ' · ' + T('cat.' + event.category)),
          h('h2', { className: 'dsh-cd-hero-title' }, event.title),
          h('div', { className: 'dsh-cd-hero-date' }, mainDateText(event)),
          h('div', { className: 'dsh-cd-card-sub' }, subDateText(event, occurrence)),
          h(
            'div',
            { className: 'dsh-cd-hero-meta' },
            event.reminderDays.length
              ? h(
                  'span',
                  { className: 'dsh-cd-tag', title: reminderSummary(event) },
                  bellIcon(11),
                  T('card.reminder'),
                )
              : null,
            event.pinned ? h('span', { className: 'dsh-cd-tag' }, pinIcon(11), T('card.pinned')) : null,
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-cd-btn dsh-cd-btn--ghost',
                title: T(event.pinned ? 'action.unpin' : 'action.pin'),
                'aria-label': T(event.pinned ? 'action.unpin' : 'action.pin'),
                onClick: function () {
                  props.onTogglePin(event);
                },
              },
              pinIcon(13),
              T(event.pinned ? 'action.unpin' : 'action.pin'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-cd-btn dsh-cd-btn--ghost',
                onClick: function () {
                  props.onEdit(event);
                },
              },
              editIcon(13),
              T('action.edit'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-cd-btn dsh-cd-btn--ghost dsh-cd-btn--danger',
                title: T('action.delete'),
                'aria-label': T('action.delete'),
                onClick: function () {
                  props.onDelete(event);
                },
              },
              trashIcon(13),
              T('action.delete'),
            ),
          ),
        ),
        h(
          'div',
          { className: 'dsh-cd-hero-dday' },
          h('span', { className: 'dsh-cd-hero-num' }, isToday ? T('list.today') : String(Math.abs(occurrence.daysUntil))),
          h(
            'span',
            { className: 'dsh-cd-hero-unit' },
            isToday ? T('list.todayHint') : occurrence.daysUntil > 0 ? T('list.daysAfter') : T('list.daysPast'),
          ),
        ),
      );
    }

    function EmptyState(props) {
      const quick = props.quick;
      return h(
        'div',
        { className: 'dsh-cd-empty' },
        h('span', { className: 'dsh-cd-empty-icon' }, calendarIcon(26)),
        h('h3', { className: 'dsh-cd-empty-title' }, T('list.empty')),
        h('p', { className: 'dsh-cd-empty-desc' }, T('list.emptyDesc')),
        quick
          ? h(
              'div',
              { className: 'dsh-cd-empty-actions' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-cd-btn',
                  onClick: function () {
                    props.onQuickAdd('birthday');
                  },
                },
                cakeIcon(14),
                T('list.emptyBirthday'),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-cd-btn',
                  onClick: function () {
                    props.onQuickAdd('anniversary');
                  },
                },
                heartIcon(14),
                T('list.emptyAnniversary'),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-cd-btn',
                  onClick: function () {
                    props.onQuickAdd('loan');
                  },
                },
                bankIcon(14),
                T('list.emptyLoan'),
              ),
            )
          : null,
      );
    }

    /* ------------------------------------------------------------------ */
    /* Editor                                                             */
    /* ------------------------------------------------------------------ */

    function lunarDraftFromSolar(input) {
      const date =
        input instanceof Date
          ? input
          : new Date(Number(input.year), Number(input.month) - 1, Number(input.day), 12);
      const parts = lunarPartsOf(date);
      if (!parts) {
        return { year: date.getFullYear(), month: 1, day: 1, leap: false };
      }
      return { year: parts.year, month: parts.month, day: parts.day, leap: parts.leap };
    }

    function makeDraft(event, settings, presetCategory) {
      const today = new Date();
      if (event) {
        let solarDate = solarInput(today);
        if (event.dateType === 'solar') {
          solarDate = event.solar.year + '-' + pad2(event.solar.month) + '-' + pad2(event.solar.day);
        } else {
          const converted = lunarDateOf(event.lunar.year, event.lunar.month, event.lunar.day, event.lunar.leap);
          if (converted) solarDate = solarInput(converted);
        }
        const base = event.dateType === 'lunar' ? event.lunar : lunarDraftFromSolar(parseSolarInput(solarDate) || today);
        return {
          id: event.id,
          title: event.title,
          category: event.category,
          dateType: event.dateType,
          solarDate: solarDate,
          lunar: { year: base.year, month: base.month, day: base.day, leap: !!base.leap },
          recurrence: event.recurrence,
          reminderDays: event.reminderDays.slice(),
          reminderTime: event.reminderTime,
          note: event.note,
          pinned: !!event.pinned,
          createdAt: event.createdAt,
        };
      }
      return {
        title: '',
        category: CATEGORIES.indexOf(presetCategory) >= 0 ? presetCategory : 'birthday',
        dateType: 'solar',
        solarDate: solarInput(today),
        lunar: lunarDraftFromSolar(today),
        recurrence: 'yearly',
        reminderDays: [0, 1, 3],
        reminderTime: (settings && settings.defaultReminderTime) || '09:00',
        note: '',
        pinned: false,
        createdAt: Date.now(),
      };
    }

    function buildEvent(draft) {
      const title = String(draft.title || '').trim();
      if (!title) return { error: 'editor.errName' };
      let dateType = draft.dateType === 'lunar' && lunarSupported ? 'lunar' : 'solar';
      const event = {
        id: draft.id || uid(),
        title: title.slice(0, 80),
        category: CATEGORIES.indexOf(draft.category) >= 0 ? draft.category : 'custom',
        dateType: dateType,
        recurrence: 'yearly',
        note: String(draft.note || '').slice(0, 500),
        pinned: !!draft.pinned,
        reminderDays: (Array.isArray(draft.reminderDays) ? draft.reminderDays.slice() : [0])
          .map(Number)
          .filter(function (value) {
            return Number.isInteger(value) && value >= 0 && value <= 365;
          })
          .sort(function (a, b) {
            return a - b;
          }),
        reminderTime: typeof draft.reminderTime === 'string' && /^\d{2}:\d{2}$/.test(draft.reminderTime) ? draft.reminderTime : '09:00',
        createdAt: draft.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      if (dateType === 'solar') {
        const parsed = parseSolarInput(draft.solarDate);
        if (!parsed) return { error: 'editor.errDate' };
        event.solar = parsed;
      } else {
        const year = Number(draft.lunar.year);
        const month = Number(draft.lunar.month);
        const day = Number(draft.lunar.day);
        const leap = !!draft.lunar.leap;
        if (!(year >= 1900 && year <= 2100) || !(month >= 1 && month <= 12) || !(day >= 1 && day <= 30)) {
          return { error: 'editor.errLunar' };
        }
        if (leap && lunarYearLeapMonth(year) !== month) return { error: 'editor.errLeap' };
        if (!lunarDateOf(year, month, day, leap)) return { error: 'editor.errLunar' };
        event.lunar = { year: year, month: month, day: day, leap: leap };
      }
      const allowed = dateType === 'lunar' ? ['yearly', 'once'] : ['yearly', 'monthly', 'weekly', 'once'];
      event.recurrence = allowed.indexOf(draft.recurrence) >= 0 ? draft.recurrence : 'yearly';
      return { event: event };
    }

    function EditorModal(props) {
      const editing = !!props.event;
      const [draft, setDraft] = useState(function () {
        return makeDraft(props.event, props.settings, props.presetCategory);
      });
      const [error, setError] = useState('');
      const titleRef = useRef(null);

      useEffect(
        function () {
          const timer = setTimeout(function () {
            if (titleRef.current) titleRef.current.focus();
          }, 40);
          return function () {
            clearTimeout(timer);
          };
        },
        [],
      );

      function update(patch) {
        setDraft(function (previous) {
          return Object.assign({}, previous, patch);
        });
        setError('');
      }

      function updateLunar(patch) {
        setDraft(function (previous) {
          const lunar = Object.assign({}, previous.lunar, patch);
          if (patch.month !== undefined || patch.year !== undefined) {
            if (lunar.leap && lunarYearLeapMonth(Number(lunar.year)) !== Number(lunar.month)) lunar.leap = false;
          }
          return Object.assign({}, previous, { lunar: lunar });
        });
        setError('');
      }

      const built = useMemo(
        function () {
          return buildEvent(draft);
        },
        [draft],
      );

      const preview = useMemo(
        function () {
          if (!built.event) return null;
          return occurrenceFor(built.event, new Date());
        },
        [built],
      );

      function switchDateType(next) {
        if (next === draft.dateType) return;
        if (next === 'lunar') {
          const parsed = parseSolarInput(draft.solarDate);
          const lunar = parsed ? lunarDraftFromSolar(parsed) : draft.lunar;
          update({ dateType: 'lunar', lunar: lunar });
        } else {
          const converted = lunarDateOf(
            Number(draft.lunar.year),
            Number(draft.lunar.month),
            Number(draft.lunar.day),
            !!draft.lunar.leap,
          );
          update({ dateType: 'solar', solarDate: converted ? solarInput(converted) : draft.solarDate });
        }
      }

      function toggleReminderDay(day) {
        setDraft(function (previous) {
          const exists = previous.reminderDays.indexOf(day) >= 0;
          const next = exists
            ? previous.reminderDays.filter(function (value) {
                return value !== day;
              })
            : previous.reminderDays.concat([day]).sort(function (a, b) {
                return a - b;
              });
          return Object.assign({}, previous, { reminderDays: next });
        });
        setError('');
      }

      function submit() {
        const result = buildEvent(draft);
        if (result.error) {
          setError(result.error);
          return;
        }
        props.onSubmit(result.event);
      }

      const recurringOptions = draft.dateType === 'lunar' ? ['yearly', 'once'] : RECURRENCES;
      const leapMonthOfYear = lunarYearLeapMonth(Number(draft.lunar.year));
      const showLeap = leapMonthOfYear === Number(draft.lunar.month);
      const todayLunarYear = lunarPartsOf(new Date());
      const currentLunarYear = todayLunarYear ? todayLunarYear.year : new Date().getFullYear();
      const yearOptions = [];
      for (let year = currentLunarYear - 100; year <= currentLunarYear + 5; year += 1) yearOptions.push(year);
      if (yearOptions.indexOf(Number(draft.lunar.year)) < 0) yearOptions.push(Number(draft.lunar.year));
      yearOptions.sort(function (a, b) {
        return a - b;
      });

      const errorText = error ? T(error) : '';
      const dateTypeLabel = draft.dateType === 'lunar' ? T('editor.lunar') : T('editor.solar');

      return h(
        Modal,
        {
          title: editing ? T('editor.editTitle') : T('editor.createTitle'),
          subtitle: draft.dateType === 'lunar' ? dateTypeLabel + ' · ' + T('editor.lunarHint') : dateTypeLabel,
          onClose: props.onClose,
          footer: h(
            React.Fragment,
            null,
            h(
              'button',
              { type: 'button', className: 'dsh-cd-btn', onClick: props.onClose },
              T('action.cancel'),
            ),
            h(
              'button',
              { type: 'button', className: 'dsh-cd-btn dsh-cd-btn--primary', onClick: submit },
              checkIcon(14),
              T('action.save'),
            ),
          ),
        },
        h(
          'div',
          { className: 'dsh-cd-form' },
          h(
            Field,
            { label: T('editor.name') },
            h('input', {
              ref: titleRef,
              className: 'dsh-cd-input',
              type: 'text',
              value: draft.title,
              maxLength: 80,
              placeholder: T('editor.namePlaceholder'),
              'aria-label': T('editor.name'),
              onChange: function (event) {
                update({ title: event.target.value });
              },
            }),
          ),
          h(
            Field,
            { label: T('editor.category') },
            h(
              'div',
              { className: 'dsh-cd-catopts' },
              CATEGORIES.map(function (category) {
                const Icon = CATEGORY_ICONS[category];
                return h(
                  'button',
                  {
                    key: category,
                    type: 'button',
                    className: 'dsh-cd-catopt' + (draft.category === category ? ' is-on' : ''),
                    'data-cat': category,
                    onClick: function () {
                      update({ category: category });
                    },
                  },
                  Icon(13),
                  T('cat.' + category),
                );
              }),
            ),
          ),
          h(
            Field,
            { label: T('editor.date') },
            h(
              'div',
              { className: 'dsh-cd-seg', role: 'tablist' },
              ['solar', 'lunar'].map(function (type) {
                const disabled = type === 'lunar' && !lunarSupported;
                return h(
                  'button',
                  {
                    key: type,
                    type: 'button',
                    role: 'tab',
                    disabled: disabled,
                    'aria-selected': draft.dateType === type ? 'true' : 'false',
                    className: 'dsh-cd-seg-btn' + (draft.dateType === type ? ' is-on' : ''),
                    onClick: function () {
                      switchDateType(type);
                    },
                  },
                  type === 'lunar' ? T('editor.lunar') : T('editor.solar'),
                );
              }),
            ),
          ),
          draft.dateType === 'solar'
            ? h('input', {
                className: 'dsh-cd-input',
                type: 'date',
                value: draft.solarDate,
                min: '1900-01-01',
                max: '2100-12-31',
                'aria-label': T('editor.date'),
                onChange: function (event) {
                  update({ solarDate: event.target.value });
                },
              })
            : h(
                React.Fragment,
                null,
                h(
                  'div',
                  { className: 'dsh-cd-grid3' },
                  h(
                    Field,
                    { label: T('editor.lunarYear') },
                    h(
                      'select',
                      {
                        className: 'dsh-cd-input',
                        value: String(draft.lunar.year),
                        'aria-label': T('editor.lunarYear'),
                        onChange: function (event) {
                          updateLunar({ year: Number(event.target.value) });
                        },
                      },
                      yearOptions.map(function (year) {
                        return h('option', { key: year, value: String(year) }, year + '年');
                      }),
                    ),
                  ),
                  h(
                    Field,
                    { label: T('editor.lunarMonth') },
                    h(
                      'select',
                      {
                        className: 'dsh-cd-input',
                        value: String(draft.lunar.month),
                        'aria-label': T('editor.lunarMonth'),
                        onChange: function (event) {
                          updateLunar({ month: Number(event.target.value) });
                        },
                      },
                      LUNAR_MONTH_NAMES.map(function (name, index) {
                        return h(
                          'option',
                          { key: index + 1, value: String(index + 1) },
                          activeLanguage(Bridge.ctx) === 'zh' ? name : ordinal(index + 1) + ' month',
                        );
                      }),
                    ),
                  ),
                  h(
                    Field,
                    { label: T('editor.lunarDay') },
                    h(
                      'select',
                      {
                        className: 'dsh-cd-input',
                        value: String(draft.lunar.day),
                        'aria-label': T('editor.lunarDay'),
                        onChange: function (event) {
                          updateLunar({ day: Number(event.target.value) });
                        },
                      },
                      Array.from({ length: 30 }, function (_, index) {
                        return index + 1;
                      }).map(function (day) {
                        return h(
                          'option',
                          { key: day, value: String(day) },
                          activeLanguage(Bridge.ctx) === 'zh' ? lunarDayName(day) : ordinal(day) + ' day',
                        );
                      }),
                    ),
                  ),
                ),
                showLeap
                  ? h(
                      'label',
                      { className: 'dsh-cd-check' },
                      h('input', {
                        type: 'checkbox',
                        checked: !!draft.lunar.leap,
                        onChange: function (event) {
                          updateLunar({ leap: event.target.checked });
                        },
                      }),
                      T('editor.leap'),
                    )
                  : null,
                h('p', { className: 'dsh-cd-hint' }, T('editor.lunarHint')),
              ),
          h(
            Field,
            { label: T('editor.recurrence') },
            h(
              'div',
              { className: 'dsh-cd-recur' },
              recurringOptions.map(function (recurrence) {
                return h(
                  'button',
                  {
                    key: recurrence,
                    type: 'button',
                    className: 'dsh-cd-daychip' + (draft.recurrence === recurrence ? ' is-on' : ''),
                    onClick: function () {
                      update({ recurrence: recurrence });
                    },
                  },
                  T('recur.' + recurrence),
                );
              }),
            ),
          ),
          h(
            Field,
            { label: T('editor.reminderDays'), hint: T('editor.reminderHint') },
            h(
              'div',
              { className: 'dsh-cd-days' },
              REMINDER_CHOICES.map(function (day) {
                return h(
                  'button',
                  {
                    key: day,
                    type: 'button',
                    className: 'dsh-cd-daychip' + (draft.reminderDays.indexOf(day) >= 0 ? ' is-on' : ''),
                    onClick: function () {
                      toggleReminderDay(day);
                    },
                  },
                  day === 0 ? T('editor.sameDay') : T('editor.daysBefore', { n: day }),
                );
              }),
            ),
          ),
          h(
            'div',
            { className: 'dsh-cd-grid2' },
            h(
              Field,
              { label: T('editor.reminderTime') },
              h('input', {
                className: 'dsh-cd-input',
                type: 'time',
                value: draft.reminderTime,
                'aria-label': T('editor.reminderTime'),
                onChange: function (event) {
                  update({ reminderTime: event.target.value });
                },
              }),
            ),
            h(
              'div',
              { className: 'dsh-cd-field' },
              h('span', { className: 'dsh-cd-label' }, ' '),
              h(
                'label',
                { className: 'dsh-cd-check' },
                h('input', {
                  type: 'checkbox',
                  checked: !!draft.pinned,
                  onChange: function (event) {
                    update({ pinned: event.target.checked });
                  },
                }),
                T('editor.pin'),
              ),
            ),
          ),
          h(
            Field,
            { label: T('editor.note') },
            h('textarea', {
              className: 'dsh-cd-input',
              value: draft.note,
              maxLength: 500,
              rows: 2,
              placeholder: T('editor.notePlaceholder'),
              'aria-label': T('editor.note'),
              onChange: function (event) {
                update({ note: event.target.value });
              },
            }),
          ),
          h(
            'div',
            { className: 'dsh-cd-preview' + (error ? ' is-bad' : '') },
            error ? closeIcon(15) : checkIcon(15),
            h(
              'span',
              null,
              error
                ? errorText
                : preview
                  ? T('editor.preview', {
                      date: formatSolarDate(preview.date, true) + ' ' + weekdayShort(preview.date),
                      lunar: lunarTextOfDate(preview.date),
                    }) +
                    (preview.daysUntil < 0 ? ' · ' + T('editor.previewPast') : '')
                  : T('editor.errDate'),
            ),
          ),
        ),
      );
    }

    /* ------------------------------------------------------------------ */
    /* Settings                                                           */
    /* ------------------------------------------------------------------ */

    function SettingsModal(props) {
      const [confirmClear, setConfirmClear] = useState(false);
      const permission =
        typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';

      function toggleNotifications(next) {
        if (!next) {
          props.onUpdate({ notifications: false });
          return;
        }
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          try {
            const promise = Notification.requestPermission();
            if (promise && typeof promise.then === 'function') {
              promise.then(function () {
                props.onUpdate({ notifications: true });
              });
            } else {
              props.onUpdate({ notifications: true });
            }
          } catch (err) {
            props.onUpdate({ notifications: true });
          }
          return;
        }
        props.onUpdate({ notifications: true });
        if (permission === 'denied') props.onNotifyDenied();
      }

      let permissionText = T('settings.notifyAsk');
      if (permission === 'granted') permissionText = T('settings.notifyOn');
      else if (permission === 'denied') permissionText = T('settings.notifyOff');

      return h(
        Modal,
        {
          title: T('settings.title'),
          onClose: props.onClose,
          footer: h(
            'button',
            { type: 'button', className: 'dsh-cd-btn', onClick: props.onClose },
            T('action.close'),
          ),
        },
        h(
          'div',
          { className: 'dsh-cd-settings' },
          h(
            'div',
            { className: 'dsh-cd-settings-section' },
            h('p', { className: 'dsh-cd-section-label' }, T('editor.reminder')),
            h(Switch, {
              checked: !!props.settings.notifications,
              label: T('settings.notify'),
              desc: T('settings.notifyDesc'),
              onChange: toggleNotifications,
            }),
            h(
              'div',
              { className: 'dsh-cd-btnrow' },
              h('span', { className: 'dsh-cd-hint' }, permissionText),
              permission === 'default' && typeof Notification !== 'undefined'
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'dsh-cd-btn',
                      onClick: function () {
                        toggleNotifications(true);
                      },
                    },
                    bellIcon(14),
                    T('action.allowNotify'),
                  )
                : null,
              h(
                'button',
                { type: 'button', className: 'dsh-cd-btn', onClick: props.onTest },
                bellIcon(14),
                T('action.testNotify'),
              ),
            ),
            h(Field, { label: T('settings.defaultTime'), hint: T('settings.defaultTimeHint') },
              h('input', {
                className: 'dsh-cd-input',
                type: 'time',
                value: props.settings.defaultReminderTime,
                'aria-label': T('settings.defaultTime'),
                onChange: function (event) {
                  props.onUpdate({ defaultReminderTime: event.target.value });
                },
              })),
          ),
          h(
            'div',
            { className: 'dsh-cd-settings-section' },
            h('p', { className: 'dsh-cd-section-label' }, T('settings.data')),
            h('p', { className: 'dsh-cd-hint' }, T('settings.exportDesc')),
            h(
              'div',
              { className: 'dsh-cd-btnrow' },
              h(
                'button',
                { type: 'button', className: 'dsh-cd-btn', onClick: props.onExport },
                downloadIcon(14),
                T('action.export'),
              ),
              h(
                'button',
                { type: 'button', className: 'dsh-cd-btn', onClick: props.onImport },
                uploadIcon(14),
                T('action.import'),
              ),
            ),
            h('p', { className: 'dsh-cd-hint' }, T('settings.clearDesc')),
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-cd-btn dsh-cd-btn--danger',
                onClick: function () {
                  if (!confirmClear) {
                    setConfirmClear(true);
                    return;
                  }
                  props.onClear();
                },
              },
              trashIcon(14),
              T('action.clear') + (confirmClear ? ' · ' + T('settings.clearConfirm') : ''),
            ),
          ),
          h(
            'div',
            { className: 'dsh-cd-settings-section' },
            h('p', { className: 'dsh-cd-section-label' }, T('settings.about')),
            h(
              'div',
              { className: 'dsh-cd-kv' },
              h('span', null, T('settings.count')),
              h('span', null, String(props.eventCount)),
            ),
            h(
              'div',
              { className: 'dsh-cd-kv' },
              h('span', null, T('settings.storage')),
              h('span', null, T('settings.storageValue')),
            ),
            h(
              'div',
              { className: 'dsh-cd-kv' },
              h('span', null, T('settings.lunar')),
              h('span', null, T('settings.lunarValue')),
            ),
            h(
              'div',
              { className: 'dsh-cd-kv' },
              h('span', null, T('settings.version')),
              h('span', null, '1.0.0'),
            ),
          ),
        ),
      );
    }

    /* ------------------------------------------------------------------ */
    /* Delete / import modals                                             */
    /* ------------------------------------------------------------------ */

    function DeleteModal(props) {
      return h(
        Modal,
        {
          narrow: true,
          title: T('delete.title'),
          onClose: props.onClose,
          footer: h(
            React.Fragment,
            null,
            h('button', { type: 'button', className: 'dsh-cd-btn', onClick: props.onClose }, T('action.cancel')),
            h(
              'button',
              { type: 'button', className: 'dsh-cd-btn dsh-cd-btn--danger', onClick: props.onConfirm },
              trashIcon(14),
              T('action.delete'),
            ),
          ),
        },
        h('p', { className: 'dsh-cd-hint' }, T('delete.desc', { name: props.event.title })),
      );
    }

    function ImportModal(props) {
      return h(
        Modal,
        {
          narrow: true,
          title: T('import.title'),
          onClose: props.onClose,
          footer: h(
            React.Fragment,
            null,
            h('button', { type: 'button', className: 'dsh-cd-btn', onClick: props.onClose }, T('action.cancel')),
            h(
              'button',
              { type: 'button', className: 'dsh-cd-btn dsh-cd-btn--primary', onClick: props.onConfirm },
              uploadIcon(14),
              T('action.confirmImport'),
            ),
          ),
        },
        h(
          'p',
          { className: 'dsh-cd-hint' },
          T('import.desc', { n: props.events.length, m: props.currentCount }),
        ),
      );
    }

    /* ------------------------------------------------------------------ */
    /* Panel                                                              */
    /* ------------------------------------------------------------------ */

    function parseBackup(text) {
      try {
        return decodeEvents(JSON.parse(text));
      } catch (err) {
        return null;
      }
    }

    function CountdownPanel() {
      const storageSnapshot = useRef({ locked: true });
      const [state, setState] = useState(function () { return loadState(storageSnapshot.current); });
      const [settings, setSettings] = useState(loadSettings);
      const [query, setQuery] = useState('');
      const [filter, setFilter] = useState('all');
      const [modal, setModal] = useState(null);
      const [toast, setToast] = useState(null);
      const [dayTick, setDayTick] = useState(0);
      const [, setLocaleTick] = useState(0);
      const toastTimer = useRef(null);
      const stateRef = useRef(state);
      const fileRef = useRef(null);

      useEffect(
        function () {
          stateRef.current = state;
        },
        [state],
      );

      const showToast = useCallback(function (key, vars) {
        setToast({ text: translate(Bridge.ctx, key, vars) });
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(function () {
          setToast(null);
        }, 2800);
      }, []);

      useEffect(
        function () {
          return function () {
            clearTimeout(toastTimer.current);
          };
        },
        [],
      );

      useEffect(
        function () {
          const timer = setInterval(function () {
            setDayTick(function (value) {
              return value + 1;
            });
          }, 60000);
          return function () {
            clearInterval(timer);
          };
        },
        [],
      );

      useEffect(
        function () {
          const locale = localeOf(Bridge.ctx);
          if (!locale || typeof locale.subscribe !== 'function') return undefined;
          return locale.subscribe(function () {
            setLocaleTick(function (value) {
              return value + 1;
            });
          });
        },
        [],
      );

      useEffect(
        function () {
          function onNotify(event) {
            const items = (event && event.detail && event.detail.items) || [];
            if (!items.length) return;
            setToast({ text: translate(Bridge.ctx, 'reminder.title') + ': ' + items.map(function (item) {
              return item.title;
            }).join(' / ') });
            clearTimeout(toastTimer.current);
            toastTimer.current = setTimeout(function () {
              setToast(null);
            }, 4000);
          }
          window.addEventListener('dsh-countdown:notify', onNotify);
          return function () {
            window.removeEventListener('dsh-countdown:notify', onNotify);
          };
        },
        [],
      );

      useEffect(
        function () {
          function onFocus() {
            setSettings(loadSettings());
            setDayTick(function (value) {
              return value + 1;
            });
          }
          window.addEventListener('focus', onFocus);
          return function () {
            window.removeEventListener('focus', onFocus);
          };
        },
        [],
      );

      const decorated = useMemo(
        function () {
          const today = new Date();
          const items = [];
          state.events.forEach(function (event) {
            const occurrence = occurrenceFor(event, today);
            if (occurrence) items.push({ event: event, occurrence: occurrence });
          });
          return items;
        },
        [state.events, dayTick],
      );

      const filtered = useMemo(
        function () {
          const needle = query.trim().toLowerCase();
          return decorated.filter(function (item) {
            if (filter !== 'all' && item.event.category !== filter) return false;
            if (!needle) return true;
            const haystack = (item.event.title + ' ' + item.event.note).toLowerCase();
            return haystack.indexOf(needle) >= 0;
          });
        },
        [decorated, filter, query],
      );

      const upcoming = filtered
        .filter(function (item) {
          return item.occurrence.daysUntil >= 0;
        })
        .sort(function (a, b) {
          if (!!a.event.pinned !== !!b.event.pinned) return a.event.pinned ? -1 : 1;
          if (a.occurrence.daysUntil !== b.occurrence.daysUntil) return a.occurrence.daysUntil - b.occurrence.daysUntil;
          return a.event.title.localeCompare(b.event.title);
        });

      const past = filtered
        .filter(function (item) {
          return item.occurrence.daysUntil < 0;
        })
        .sort(function (a, b) {
          return b.occurrence.daysUntil - a.occurrence.daysUntil;
        });

      const dueToday = decorated.filter(function (item) {
        return item.occurrence.daysUntil === 0;
      });

      const hero = upcoming.length ? upcoming[0] : null;
      const restUpcoming = upcoming.length ? upcoming.slice(1) : [];
      const total = state.events.length;
      const filteredCount = filtered.length;
      const todayDate = new Date();
      const todayLunar = lunarPartsOf(todayDate);

      function commitEvents(events) {
        const next = { schema: SCHEMA, version: STORE_VERSION, events: events };
        if (!saveState(next, storageSnapshot.current)) {
          showToast('toast.storageLocked');
          return false;
        }
        stateRef.current = next;
        setState(next);
        return true;
      }

      function openEditor(event, presetCategory) {
        setModal({ type: 'editor', event: event || null, presetCategory: presetCategory || null });
      }

      function submitEvent(event) {
        const events = stateRef.current.events.slice();
        const index = events.findIndex(function (item) {
          return item.id === event.id;
        });
        if (index >= 0) events[index] = event;
        else events.push(event);
        if (!commitEvents(events)) return;
        setModal(null);
        showToast('toast.saved');
      }

      function deleteEvent(event) {
        if (!commitEvents(
          stateRef.current.events.filter(function (item) {
            return item.id !== event.id;
          }),
        )) return;
        setModal(null);
        showToast('toast.deleted');
      }

      function togglePin(event) {
        commitEvents(
          stateRef.current.events.map(function (item) {
            if (item.id !== event.id) return item;
            return Object.assign({}, item, { pinned: !item.pinned, updatedAt: Date.now() });
          }),
        );
      }

      function updateSettings(partial) {
        const next = Object.assign({}, loadSettings(), partial);
        if (!saveSettings(next)) {
          showToast('toast.storageLocked');
          return;
        }
        setSettings(next);
      }

      function exportBackup() {
        if (!snapshotIsCurrent(storageSnapshot.current)) {
          showToast('toast.storageLocked');
          return;
        }
        const payload = {
          schema: SCHEMA,
          version: STORE_VERSION,
          exportedAt: new Date().toISOString(),
          events: stateRef.current.events,
        };
        try {
          const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = 'countdown-days-' + dateKey(new Date()) + '.json';
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          setTimeout(function () {
            URL.revokeObjectURL(url);
          }, 1500);
          showToast('toast.exported');
        } catch (err) {
          showToast('toast.invalid');
        }
      }

      function triggerImport() {
        if (fileRef.current) fileRef.current.click();
      }

      function handleFileChange(event) {
        const file = event.target.files && event.target.files[0];
        event.target.value = '';
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function () {
          const events = parseBackup(String(reader.result || ''));
          if (!events) {
            showToast('toast.invalid');
            return;
          }
          setModal({ type: 'import', events: events });
        };
        reader.onerror = function () {
          showToast('toast.invalid');
        };
        reader.readAsText(file);
      }

      function confirmImport(events) {
        if (!commitEvents(events)) return;
        setModal(null);
        showToast('toast.imported', { n: events.length });
      }

      function clearAll() {
        if (!commitEvents([])) return;
        setModal(null);
        showToast('toast.cleared');
      }

      function testNotify() {
        try {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(T('reminder.title'), { body: T('settings.test') });
          }
        } catch (err) {
          /* still show the in-app toast */
        }
        showToast('toast.test');
      }

      const editorEvent = modal && modal.type === 'editor' ? modal.event : null;

      return h(
        'div',
        { className: 'dsh-cd-root' },
        h(
          'header',
          { className: 'dsh-cd-head' },
          h(
            'div',
            { className: 'dsh-cd-head-main' },
            h(
              'div',
              { className: 'dsh-cd-title-row' },
              h('span', { className: 'dsh-cd-logo' }, calendarIcon(18)),
              h('h1', { className: 'dsh-cd-title' }, T('panel.title')),
            ),
            h('p', { className: 'dsh-cd-sub' }, T('panel.subtitle')),
          ),
          h(
            'div',
            { className: 'dsh-cd-head-side' },
            h(
              'div',
              { className: 'dsh-cd-today', title: T('list.today') },
              h(
                'span',
                { className: 'dsh-cd-today-date' },
                formatSolarDate(todayDate, true) + ' ' + weekdayShort(todayDate),
              ),
              todayLunar
                ? h(
                    'span',
                    { className: 'dsh-cd-today-lunar' },
                    lunarPrefix() +
                      lunarLabel(todayLunar.month, todayLunar.day, todayLunar.leap) +
                      ' · ' +
                      todayLunar.yearName +
                      '年',
                  )
                : null,
            ),
            h(
              'div',
              { className: 'dsh-cd-actions' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-cd-btn',
                  onClick: function () {
                    setModal({ type: 'settings' });
                  },
                },
                gearIcon(14),
                T('action.settings'),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-cd-btn dsh-cd-btn--primary',
                  onClick: function () {
                    openEditor(null, null);
                  },
                },
                plusIcon(15),
                T('action.add'),
              ),
            ),
          ),
        ),
        h(
          'div',
          { className: 'dsh-cd-body' },
          h(
            'div',
            { className: 'dsh-cd-column' },
            storageSnapshot.current.locked
              ? h('div', { className: 'dsh-cd-preview is-bad', role: 'alert' }, T('storage.readError'))
              : null,
            dueToday.length
              ? h(
                  'div',
                  { className: 'dsh-cd-reminderbar' },
                  bellIcon(15),
                  h(
                    'span',
                    null,
                    T('list.todayReminder', {
                      names: dueToday
                        .map(function (item) {
                          return item.event.title;
                        })
                        .join('、'),
                    }),
                  ),
                )
              : null,
            h(
              'div',
              { className: 'dsh-cd-toolbar' },
              h(
                'div',
                { className: 'dsh-cd-search' },
                searchIcon(15),
                h('input', {
                  className: 'dsh-cd-input',
                  type: 'search',
                  value: query,
                  placeholder: T('list.search'),
                  'aria-label': T('list.search'),
                  onChange: function (event) {
                    setQuery(event.target.value);
                  },
                }),
              ),
              h(
                'div',
                { className: 'dsh-cd-chips' },
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-cd-chip' + (filter === 'all' ? ' is-on' : ''),
                    onClick: function () {
                      setFilter('all');
                    },
                  },
                  T('filter.all'),
                ),
                CATEGORIES.map(function (category) {
                  return h(
                    'button',
                    {
                      key: category,
                      type: 'button',
                      className: 'dsh-cd-chip' + (filter === category ? ' is-on' : ''),
                      'data-cat': category,
                      onClick: function () {
                        setFilter(category);
                      },
                    },
                    h('span', { className: 'dsh-cd-dot' }),
                    T('cat.' + category),
                  );
                }),
              ),
            ),
            h(
              'p',
              { className: 'dsh-cd-count' },
              query || filter !== 'all'
                ? T('list.countFiltered', { shown: filteredCount, total: total })
                : T('list.count', { n: total }),
            ),
            total === 0
              ? h(EmptyState, {
                  quick: true,
                  onQuickAdd: function (category) {
                    openEditor(null, category);
                  },
                })
              : filteredCount === 0
                ? h(
                    'div',
                    { className: 'dsh-cd-empty' },
                    h('span', { className: 'dsh-cd-empty-icon' }, searchIcon(24)),
                    h('h3', { className: 'dsh-cd-empty-title' }, T('list.none')),
                    h('p', { className: 'dsh-cd-empty-desc' }, T('list.noneDesc')),
                  )
                : h(
                    React.Fragment,
                    null,
                    hero
                      ? h(HeroCard, {
                          item: hero,
                          onEdit: function (event) {
                            openEditor(event, null);
                          },
                          onDelete: function (event) {
                            setModal({ type: 'delete', event: event });
                          },
                          onTogglePin: togglePin,
                        })
                      : null,
                    restUpcoming.length
                      ? h(
                          'div',
                          { className: 'dsh-cd-grid' },
                          restUpcoming.map(function (item) {
                            return h(EventCard, {
                              key: item.event.id,
                              item: item,
                              onEdit: function (event) {
                                openEditor(event, null);
                              },
                              onDelete: function (event) {
                                setModal({ type: 'delete', event: event });
                              },
                              onTogglePin: togglePin,
                            });
                          }),
                        )
                      : null,
                    past.length
                      ? h(
                          React.Fragment,
                          null,
                          h(
                            'div',
                            { className: 'dsh-cd-section-head' },
                            h('h2', { className: 'dsh-cd-section-title' }, T('list.past')),
                            h('span', { className: 'dsh-cd-count' }, String(past.length)),
                          ),
                          h(
                            'div',
                            { className: 'dsh-cd-grid' },
                            past.map(function (item) {
                              return h(EventCard, {
                                key: item.event.id,
                                item: item,
                                onEdit: function (event) {
                                  openEditor(event, null);
                                },
                                onDelete: function (event) {
                                  setModal({ type: 'delete', event: event });
                                },
                                onTogglePin: togglePin,
                              });
                            }),
                          ),
                        )
                      : null,
                  ),
            h('p', { className: 'dsh-cd-footnote' }, T('list.footnote')),
          ),
        ),
        h('input', {
          ref: fileRef,
          type: 'file',
          className: 'dsh-cd-file',
          accept: 'application/json,.json',
          style: { display: 'none' },
          onChange: handleFileChange,
        }),
        modal && modal.type === 'editor'
          ? h(EditorModal, {
              event: modal.event,
              presetCategory: modal.presetCategory,
              settings: settings,
              onClose: function () {
                setModal(null);
              },
              onSubmit: submitEvent,
            })
          : null,
        modal && modal.type === 'settings'
          ? h(SettingsModal, {
              settings: settings,
              eventCount: total,
              onUpdate: updateSettings,
              onClose: function () {
                setModal(null);
              },
              onExport: exportBackup,
              onImport: triggerImport,
              onClear: clearAll,
              onTest: testNotify,
              onNotifyDenied: function () {
                showToast('toast.notifyDenied');
              },
            })
          : null,
        modal && modal.type === 'delete'
          ? h(DeleteModal, {
              event: modal.event,
              onClose: function () {
                setModal(null);
              },
              onConfirm: function () {
                deleteEvent(modal.event);
              },
            })
          : null,
        modal && modal.type === 'import'
          ? h(ImportModal, {
              events: modal.events,
              currentCount: total,
              onClose: function () {
                setModal(null);
              },
              onConfirm: function () {
                confirmImport(modal.events);
              },
            })
          : null,
        toast ? h('div', { className: 'dsh-cd-toast', role: 'status' }, toast.text) : null,
      );
    }

    /* ------------------------------------------------------------------ */
    /* Plugin                                                             */
    /* ------------------------------------------------------------------ */

    return {
      inject: ['slots'],
      apply(ctx) {
        Bridge.ctx = ctx;

        const locale = localeOf(ctx);
        if (locale && typeof locale.register === 'function') {
          [
            ['en', EN],
            ['zh', ZH],
            ['zh-CN', ZH],
          ].forEach(function (pair) {
            try {
              ctx.effect(function () {
                return locale.register(NS, pair[0], pair[1]);
              });
            } catch (err) {
              /* the dictionary may already be registered */
            }
          });
        }

        ctx.effect(insertStyles);

        ctx.effect(function () {
          let stopped = false;
          function tick() {
            if (stopped) return;
            try {
              const current = loadSettings();
              if (!current.notifications) return;
              const now = new Date();
              if (!storageAvailable()) return;
              const due = computeDueReminders(loadState().events, current, now);
              if (due.length) fireReminders(due, now);
            } catch (err) {
              /* reminders must never break the surrounding UI */
            }
          }
          const first = setTimeout(tick, 1800);
          const timer = setInterval(tick, REMINDER_TICK_MS);
          return function () {
            stopped = true;
            clearTimeout(first);
            clearInterval(timer);
          };
        });

        ctx.slots.inject('sidebar.panellist', function () {
          return ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: PANEL_ID,
              order: 35,
              label: function () {
                return translate(Bridge.ctx, 'panel.title');
              },
            },
            function PanelIcon(props) {
              const active = !!(props && props.active);
              const box = typeof props.size === 'number' && props.size > 0 ? props.size : 22;
              const glyph = Math.max(12, Math.round(box * 0.72));
              return h(
                'span',
                {
                  className: 'dsh-cd-logo',
                  title: T('panel.title'),
                  'aria-hidden': 'true',
                  style: {
                    width: box + 'px',
                    height: box + 'px',
                    borderRadius: Math.round(box * 0.28) + 'px',
                    background: active ? 'var(--dsh-cd-accent-soft)' : 'transparent',
                    color: 'var(--dsh-cd-accent)',
                  },
                },
                calendarIcon(glyph),
              );
            },
          );
        });

        ctx.slots.inject('main', function () {
          return ctx.slots.register({ name: 'main', key: PANEL_ID }, CountdownPanel);
        });
      },
    };
  },
});
