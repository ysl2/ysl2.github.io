---
layout: post
title: "我的 tmux 配置：不讲基础，只讲我自己加的狠活 ⚙️🔥"
date: 2026-03-03 22:24:19 +0800
asset_base: /assets/posts/2026-03-03-tmux-hardcore-config
---

我这篇不讲 `tmux new -s`、不讲“什么是 pane/window/session”。
这些你会了也不代表你能高效工作。真正拉开差距的，是你怎么改配置，把操作流压到最短。🧠

下面只聊我这份配置里“额外加过刀”的地方，都是我日常真的在用的。✍️

![keymap overview]({{ page.asset_base }}/img/01-keymap-overview.svg)

## 1) 我把操作核心换成了 `C-a`，但重点不是换键，而是重排动作流 🎛️

我把默认前缀从 `C-b` 改成了 `C-a`：

```tmux
unbind C-b
set-option -g prefix C-a
bind-key C-a send-prefix
```

这本身没什么稀奇。真正关键是我后面整套绑定都围绕左手连击展开了：

- `C-a h/j/k/l`：方向切 pane（vim 肌肉记忆）
- `C-a v/s`：水平/垂直分屏
- `C-a c/g`：新建窗口（都继承当前路径）
- `C-a < - = >`：按固定步长 resize pane

收益很直接：我不需要“先想 tmux 命令再执行”，而是把动作做成了条件反射。⚡

## 2) 新窗和分屏全部继承当前路径，彻底消灭“每次 cd” 📁

```tmux
bind-key c new-window -c "#{pane_current_path}"
bind-key g new-window -c "#{pane_current_path}" -a
bind-key v split-window -h -c "#{pane_current_path}"
bind-key s split-window -v -c "#{pane_current_path}"
```

这是我最不想退回去的配置之一。你在项目 `repo/A` 里开 pane，再分屏还在 `repo/A`，上下文不断。✅

默认行为最烦人的地方就是“动作没断，目录断了”。这个配置把断点补上了。

## 3) 我单独做了“插窗脚本”，解决 tmux 默认窗口重排太笨的问题 🧩

我绑定了：

```tmux
bind-key C-g run-shell "bash ~/.vocal/0/scripts/tmux/insert_window.sh"
```

这个脚本的核心不是“交换窗口”，而是“按你给的位置插入当前窗口”。
比如：

- 输入 `0`：插到最前
- 输入 `6`（>= 最后窗口）：插到最后
- 输入 `2,3`：插到 2 和 3 之间

它还做了几件很实用的保护：

- 自动识别当前窗口布局并提示
- 校验输入合法性（不存在的窗口会报错）
- 临时关闭 `renumber-windows`，重排后恢复原设置

这个是“工作流型配置”，不是“好看型配置”。当你窗口多了，这个能省掉一堆手动 swap。🚀

## 4) 复制链路做成跨平台统一：pbcopy / wl-copy / xsel / xclip 一条龙 📋

![clipboard flow]({{ page.asset_base }}/img/02-clipboard-flow.svg)

我在 copy-mode 里做了统一管线：

```tmux
bind-key -T copy-mode-vi y send -X copy-pipe-and-cancel \
  "tr -d '\r' | (pbcopy || wl-copy || xsel --input --clipboard || xclip -in -selection clipboard)"
bind-key -T copy-mode-vi MouseDragEnd1Pane send -X copy-pipe-and-cancel \
  "tr -d '\r' | (pbcopy || wl-copy || xsel --input --clipboard || xclip -in -selection clipboard)"
```

我特意加了 `tr -d '\r'`，避免跨系统时复制内容混入 `^M`。
另外鼠标拖选也走同一套管线，避免键盘复制和鼠标复制结果不一致。🎯

## 5) 我把 Ctrl+数字做了转义直通，给编辑器/终端更多可编程热键 🔢

```tmux
bind-key -n C-0 send-keys "\e[48;5u"
bind-key -n C-1 send-keys "\e[49;5u"
...
bind-key -n C-9 send-keys "\e[57;5u"
```

再配合：

```tmux
set-option -gq allow-passthrough on
```

这套通常是“高级输入链路修复”才会做。目的很明确：
让终端程序（比如 Neovim）能更稳定拿到 Ctrl+数字类组合键，而不是被 tmux 吃掉。🛠️

## 6) 状态栏我反而做了减法：强调上下文，不塞监控小组件 🧭

![statusbar anatomy]({{ page.asset_base }}/img/03-statusbar-anatomy.svg)

我把 `status-right` 清空了，同时保留前缀状态提示：

```tmux
set-option -g status-left "#[bg=#938aa9,fg=#1e1e2e]#{?client_prefix,#[bg=#ffa066],} #S "
set-option -g status-right ""
set-option -g status-interval 1
```

为什么？

- 我更关心“我现在在哪个 session / 哪个 window”
- 不想把 CPU/RAM/网速塞进状态栏制造视觉噪音
- `status-interval 1` 让前缀状态反馈更快，按键时感知更明确

这不是审美问题，是认知带宽管理。🧠

## 7) 一些小但实用的细节，我也保留了 ✨

- `set-option -sg escape-time 0`：降低按键延迟感
- `set-window-option -g mode-keys vi`：copy-mode 全 vim 化
- `set-option -g renumber-windows on`：删窗口后编号自动收敛
- `bind-key C-r source-file ~/.tmux.conf`：热重载配置
- `bind-key e ... select-pane -T`：快速给 pane 命名，配合 pane 标签更清晰

## 最后：这份配置的核心不是“花哨”，是“少想一步” 🧱

我对 tmux 的标准就一句话：
**常用动作必须不需要思考，不常用动作也要能快速触达。**

如果你也在折腾 tmux，我建议先从三刀开始：

1. 所有新窗/分屏继承当前路径
2. 把复制链路统一成跨平台管线
3. 给“窗口重排”做一个专用动作（哪怕是最简脚本）

这三件做完，体感提升比换十个主题都大。💥
