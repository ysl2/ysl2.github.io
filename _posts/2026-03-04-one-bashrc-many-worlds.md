---
layout: post
title: "我只维护一份 bashrc/zshrc，但它帮我省掉了很多麻烦 🧰✨"
date: 2026-03-04 18:35:00 +0800
asset_base: /assets/posts/2026-03-04-one-bashrc-many-worlds
---

这篇还是那句话：不讲炫技，不讲“插件大全” 😄
我只讲我这份 `~/.bashrc` / `~/.zshrc` 怎么在真实场景里省时间、省心、省事故。🚀

如果你是“会一点命令行，但不想天天折腾配置”的人，这篇就是写给你的。☕

## 先看结果：我省掉了哪些麻烦 ✅

1. 换机器不用重配一大坨环境 🖥️➡️💻
2. 本地终端、SSH、图形会话不打架 🔌
3. 自动化可开可关，不会被反客为主 🎛️
4. 少一个工具也不会整段启动报错 🧯
5. 每天开机后更快进入“可工作状态” 🛠️

![Scenario matrix / 场景矩阵]({{ page.asset_base }}/img/01-scenario-matrix.svg)

这张图可以一句话概括：
**同一份配置，按场景做不同动作。** 🧠

## 麻烦 1：有些场景根本不该加载完整配置 🙅

我以前踩过坑：只是跑个脚本，结果把交互配置全加载了，慢还容易污染环境。😵

现在我第一步就“门禁”：

```sh
[ -t 0 ] && case "$-" in *i*) ;; *) return ;; esac
...
[ ! -t 0 ] && return
```

白话解释：

- 不是交互终端？直接返回 👋
- 不是 TTY？也别继续了 👋

这样脚本干净、终端稳定，很多奇怪问题直接消失。🧹

## 麻烦 2：macOS/Linux + bash/zsh 容易分叉 🤹

我的做法是：
系统差异只在少数入口分叉，后面尽量复用同一套流程。

比如 Homebrew 前缀统一入口：

```sh
if [ "$UNAME" = Darwin ]; then
    HOMEBREW_PREFIX=/opt/homebrew
else
    HOMEBREW_PREFIX=/home/linuxbrew/.linuxbrew
fi
```

再手工补齐 brew 相关变量：

```sh
export HOMEBREW_CELLAR="${HOMEBREW_PREFIX}/Cellar"
export HOMEBREW_REPOSITORY="${HOMEBREW_PREFIX}/Homebrew"
export MANPATH="${HOMEBREW_PREFIX}/share/man${MANPATH+:$MANPATH}:"
export INFOPATH="${HOMEBREW_PREFIX}/share/info:${INFOPATH:-}"
```

zsh 差异单独放在附加文件：

```sh
if [ -n "$ZSH_VERSION" ]; then
    [ -f ~/.bashrc.zsh ] && . ~/.bashrc.zsh
fi
```

这样就不会演变成“bash 一套、zsh 一套、mac 一套、linux 一套”那种维护地狱。🔥

## 麻烦 3：路径 PATH 越配越乱、越配越长 🧵

我不再手写一堆 `export PATH=...`，而是分三步：

```sh
addToPATH() {
    case ":$PATH:" in *:"$1":*) ;; *) PATH="$1:$PATH" ;; esac
}

searchToPATH() {
    [ ! -d "$1" ] && return
    for item in "$1"/*; do
        [ -d "${item}/bin" ] || continue
        [ -n "${item##*conda*}" ] || continue
        [ -n "${item##*forge*}" ] || continue
        PATH="${item}/bin:${PATH}"
    done
}

uniqTo() {
    content="$(eval "echo \$$1")"
    eval "$1=$(echo -n "$content" | tr ":" "\n" | awk '!x[$0]++' | tr "\n" ":")"
}
```

白话解释：

- `addToPATH` 负责“加但不重复”
- `searchToPATH` 负责“自动扫描工具目录”
- `uniqTo PATH` 负责“最后统一去重收尾”

长期看，这比手工堆 PATH 稳太多了。📌

## 麻烦 4：登录后进入工作状态太慢 🐢

我不想每次都手动“开图形环境 -> 开终端 -> 开开发会话”。
所以我加了条件自动化，但只在该自动的场景触发。

```sh
if [ -z "$SSH_CONNECTION" ] && [ -z "$DISPLAY" ] && [ -z "$WAYLAND_DISPLAY" ] && [ "$XDG_VTNR" = "1" ]; then
    if [ -n "$MYWAYLAND" ]; then
        export LIBVA_DRIVER_NAME=nvidia
        export __GLX_VENDOR_LIBRARY_NAME=nvidia
        export WLR_RENDERER=vulkan
        export WLR_NO_HARDWARE_CURSORS=1
        if [ -n "$ZSH_VERSION" ]; then
            eval 'exec ${=MYWAYLAND}'
        else
            exec $MYWAYLAND
        fi
    else
        exec startx
    fi
fi
```

![Boot flow / 启动决策流]({{ page.asset_base }}/img/02-boot-flow.svg)

重点不是“自动”，而是“有边界地自动” 🎯：

- 本地 TTY1 才自动
- SSH 场景不乱动
- Wayland / startx 都有分支

## 麻烦 5：tmux / conda 自动化要么太死，要么太乱 🔁

我把它们做成“可逆开关”，用锁文件控制：

```sh
VOCALOCK_TMUX="$VOCALOCK"/tmux
VOCALOCK_CONDA="${VOCALOCK}/conda"
```

切换函数：

```sh
toggle() {
    if [ -e "$1" ]; then
        rm "$1"
    else
        touch "$1"
        eval "$2"
    fi
}

totmux() { toggle "$VOCALOCK_TMUX" ontmux; }
toconda() { toggle "$VOCALOCK_CONDA" onconda; }
```

tmux 启动退化链路：

```sh
ontmux() {
    [ -n "$TMUX" ] && return
    local mytmux="$MYTMUX"
    [ ! -x "$mytmux" ] && command -v tmux &>/dev/null && mytmux=tmux
    [ -z "$mytmux" ] && return
    exec "$mytmux" new-session -A -s main "$SHELL"
}
```

conda 启动退化链路：

```sh
onconda() {
    local myconda="$MYCONDA"
    if [ ! -d "$myconda" ]; then
        if [ -d "${VOCAL}/anaconda3" ]; then
            myconda="${VOCAL}/anaconda3"
        elif [ -d "${VOCAL}/miniconda3" ]; then
            myconda="${VOCAL}/miniconda3"
        fi
    fi
    [ -z "$myconda" ] && return

    if [ -f "${myconda}/etc/profile.d/conda.sh" ]; then
        . "${myconda}/etc/profile.d/conda.sh"
    else
        addToPATH "${myconda}/bin"
    fi
}
```

![Fallback ladders / 退化链路]({{ page.asset_base }}/img/03-fallback-ladders.svg)

这部分核心就是：
**开关可控 + 失败可退化** 🛟

## 麻烦 6：网络和工具链状态不稳定 🌐

我这边网络场景比较多，所以镜像策略也做成可切换：

```sh
if [ "$MYNOMIRRORFLAG" != 1 ]; then
    export GOPROXY=https://goproxy.cn
    export HOMEBREW_API_DOMAIN=https://mirrors.tuna.tsinghua.edu.cn/homebrew-bottles/api
    export UV_DEFAULT_INDEX=https://mirrors.tuna.tsinghua.edu.cn/pypi/web/simple
    export HF_ENDPOINT=https://hf-mirror.com
fi
```

此外工具初始化统一走“有就启用，没有就跳过”：

```sh
command -v starship >/dev/null 2>&1 && eval "$(starship init "$BASENAME_SHELL")"
command -v zoxide >/dev/null 2>&1 && eval "$(zoxide init "$BASENAME_SHELL")"
```

这能显著减少“新机器第一天到处报错”的烦躁感。😌

## 最后：我现在怎么判断一份配置值不值得长期维护 🧭

不是看它有多少技巧，而是看它能不能做到：

1. 场景切换时不出戏
2. 依赖缺失时不崩
3. 尽快把我送进工作状态

如果你也不想在配置上花太多心力，我给一个最实用的起点：

**先做“门禁 + 开关 + 退化”这三件事。**

很多体验问题，会在这一步直接改善。💡
