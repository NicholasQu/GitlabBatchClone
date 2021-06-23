# GitlabBatchClone

Batch clone, pulling, backup all projects within priviledge in gitlab。
批量克隆，拉取，或者备份所有权限内的gitlab代码库

## Install 安装

```javascript
npm install -g gitlab-batch-clone --force
```

### Clone

```javascript
gitlab-batch-clone \
-u 'http://git.domain.com' -m 'http' \
-t 'your-private-token' -p 'v3' \
-o '/Users/Nicholas/gitlab-backup' \
-verbose
```

其中:
-m method，选择git克隆的方式。有 ssh 和 http 两个选项，建议用http，否则需要配置下密钥对。
-p apiversion, gitlab 11支持v4的rest api， 老版本的使用v3
-t private token, 登录进入gitlab，在profile里找到private token / access token.
-o ouput path, 克隆到的本地路径

### gitlab v3 api地址
https://gitlab.com/gitlab-org/gitlab-foss/-/blob/8-16-stable/doc/api/README.md

### gitlab v4 api地址
https://docs.gitlab.com/ee/api/api_resources.html

### 问题修复
可以直接修改已安装的index.js
/Users/Nicholas/.nvm/versions/node/v14.7.0/lib/node_modules/gitlab-batch-clone/index.js