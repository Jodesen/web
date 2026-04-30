# miniprogram-3-web

这是从 `miniprogram-3` 微信小程序独立拆出的网页版本。

## 目录说明

- `index.html`：网页入口
- `styles.css`：页面样式
- `app.js`：测试流程、结果、历史、海报逻辑
- `data.js`：题库和人格数据

## 使用方式

直接打开 `index.html` 即可运行。

如果需要更稳定的本地访问，可以在当前目录启动静态服务，例如：

```powershell
python -m http.server 8123
```

然后访问：

```text
http://127.0.0.1:8123/
```
