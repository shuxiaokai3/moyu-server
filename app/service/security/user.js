/* 
    @description  用户service
    @author       shuxiaokai
    @create        2020-10-08 22:10
*/

const Service = require("egg").Service;
const crypto = require("crypto");
const Sms = require("@alicloud/pop-core");
const escapeStringRegexp = require("escape-string-regexp");
const XLSX = require("xlsx");
// const user = require("../../model/security/user");
class userService extends Service {
    /** 
     * @description        获取短信验证码
     * @author              shuxiaokai
     * @updateAuthor       shuxiaokai
     * @create             2020-03-15 20:40
     * @update             2020-03-15 20:40
     * @param {any}        String - 手机号码       
     * @param {String=}    [name=xxx] - 任意类型变量       
     * @param {Number}     age - 数字类型       
     * @return {String}    返回字符串
     */

    async getMsgCode(params) {
        const { phone } = params;
        const code = this.ctx.helper.rand(100000, 999999);
        const smsConfig = this.app.config.smsConfig;
        const client = new Sms({
            ...smsConfig.base
        });
        const msgConfig = {
            ...smsConfig.template,
            PhoneNumbers: phone,
            TemplateParam: `{code: ${code}}`
        };
        const requestOption = {
            method: "POST"
        };
        await this.ctx.model.Security.Sms.updateOne({ phone }, { $set: { phone, smsCode: code }}, { upsert: true });
        await client.request("SendSms", msgConfig, requestOption);
        return;
    }

    /** 
        @description  用户注册
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @params {String}            loginName 登录名称
        @params {String}            realName 真实姓名
        @params {String}            phone 手机号码
        @params {String}            password 名称
        @params {String}            smsCode 验证码
        @return       null
    */
   
    async register(params) {
        const { loginName, realName, phone, password, smsCode } = params;
        const smsConfig = this.app.config.smsConfig; //短信配置信息
        const smsInfo = await this.ctx.model.Security.Sms.findOne({ phone });
        const isExpire = (Date.now() - new Date(smsInfo ? smsInfo.updatedAt : 0).getTime()) > smsConfig.maxAge;
        const hasSmsPhone = !!smsInfo;

        if (isExpire) {
            this.ctx.helper.errorInfo("验证码失效", 2002);
        }
        if (!hasSmsPhone) {
            this.ctx.helper.errorInfo("验证码不正确", 2003);
        }
        if (smsInfo.smsCode !== smsCode) {
            this.ctx.helper.errorInfo("验证码不正确", 2003);
        }
        if (phone !== smsInfo.phone) { //注册手机号与接受验证码手机号不一致
            this.ctx.helper.errorInfo("注册手机号与接受验证码手机号不一致", 2001);
        }
        
        const hasUser = await this.ctx.model.Security.User.findOne({ loginName }); 
        const hasPhone = await this.ctx.model.Security.User.findOne({ phone }); 
        if (hasUser) {
            this.ctx.helper.errorInfo("账号已存在", 1003);
        }
        if (hasPhone) {
            this.ctx.helper.errorInfo("该手机号已经绑定", 1003);
        }

        const doc = {};
        const hash = crypto.createHash("md5");
        const salt = this.ctx.helper.rand(10000, 9999999).toString();
        hash.update((password + salt).slice(2));
        const hashPassword = hash.digest("hex");
        doc.loginName = loginName;
        doc.realName = realName;
        doc.phone = phone;
        doc.password = hashPassword;
        doc.salt = salt;
        //临时，可能改变
        doc.roleIds = [ 
            "5ede0ba06f76185204584700", 
            "5ee980553c63cd01a49952e4"
        ];
        doc.roleNames = [ 
            "api文档-完全控制", 
            "公共基础权限"
        ],

        await this.ctx.model.Security.User.create(doc);
        return;
    }

    /** 
     * @description        来宾用户登录
     * @author              shuxiaokai
     * @create             2020-09-21 14:24
     * @return {String}    返回字符串
     */
    async loginGuest(params) {
        const { loginName, password } = params;
        const user = {};
        const hash = crypto.createHash("md5");
        const salt = this.ctx.helper.rand(10000, 9999999).toString();
        hash.update((password + salt).slice(2));
        const hashPassword = hash.digest("hex");
        user.loginName = loginName;
        user.realName = loginName;
        user.password = hashPassword;
        user.salt = salt;
        //临时，可能改变
        user.roleIds = [ 
            "5ede0ba06f76185204584700", 
            "5ee980553c63cd01a49952e4"
        ];
        user.roleNames = [ 
            "api文档-完全控制", 
            "公共基础权限"
        ],
        await this.ctx.model.Security.User.create(user);
        const loginResult = await this.loginWithPassword(params);
        //=====================================为用户拷贝一份测试文档====================================//
        const project = {
            projectName: "示例项目"
        };
        project.owner = {
            id: this.ctx.session.userInfo.id,
            name: this.ctx.session.userInfo.realName
        };
        const projectResult = await this.ctx.model.Apidoc.Project.Project.create(project);
        return loginResult;
    }
    
    /** 
     * @description        新增用户
     * @author              shuxiaokai
     * @create             2020-06-15 19:42
       @params {String}    loginName 登录名称
       @params {String}    realName 真实姓名
       @params {String}    phone 手机号码
     */
   
    async addUser(params) {
        const { loginName, realName, phone, password = "111111", roleIds, roleNames } = params;
        const hasUser = await this.ctx.model.Security.User.findOne({ loginName }); 
        const hasPhone = await this.ctx.model.Security.User.findOne({ phone }); 
        if (hasUser) {
            this.ctx.helper.errorInfo("账号已存在", 1003);
        }
        if (hasPhone) {
            this.ctx.helper.errorInfo("该手机号已经绑定", 1003);
        }
        const doc = {};
        const hash = crypto.createHash("md5");
        const salt = this.ctx.helper.rand(10000, 9999999).toString();
        hash.update((password + salt).slice(2));
        const hashPassword = hash.digest("hex");
        doc.loginName = loginName;
        doc.realName = realName;
        doc.phone = phone;
        doc.password = hashPassword;
        doc.salt = salt;
        doc.roleIds = roleIds || [];
        doc.roleNames = roleNames || [];
        await this.ctx.model.Security.User.create(doc);
        return;
    }


    /** 
        @description  用户登录（用户名密码）
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @params {String}            loginName 登录名称
        @params {String}            password 密码
        @params {String?}           captcha 验证码 3次登录错误以后出现
        @return       null
    */

    async loginWithPassword(params) {
        const loginRecord = await this.checkIsLockIP(); //检查ip是否被锁定
        const { loginName, password, captcha } = params;
        const userInfo = await this.ctx.model.Security.User.findOne({ loginName });
        const result = {};
       
        //验证码是否正确
        if (loginRecord && loginRecord.loginTimes > 3 && this.ctx.session.captcha && this.ctx.session.captcha.toLowerCase() !== captcha.toLowerCase()) {
            await this.addLoginTimes();
            this.ctx.helper.errorInfo("验证码错误", 2003);
        }
        //用户不存在
        if (!userInfo) {
            await this.addLoginTimes();
            if (loginRecord && loginRecord.loginTimes > 3) {
                this.ctx.helper.errorInfo("需要填写验证码", 2006);
            } else {
                this.ctx.helper.errorInfo("用户名或密码错误", 2004);
            }
        }
        if (!userInfo.enable) {
            this.ctx.helper.errorInfo("用户被锁定", 2008);    
        }
        //判断密码
        const hash = crypto.createHash("md5");
        hash.update((password + userInfo.salt).slice(2));
        const hashPassword = hash.digest("hex");
        if (userInfo.password !== hashPassword) {
            await this.addLoginTimes();
            if (loginRecord && loginRecord.loginTimes > 3) {
                this.ctx.helper.errorInfo("需要填写验证码", 2006);
            } else {
                this.ctx.helper.errorInfo("用户名或密码错误", 2004);
            }
        }
        //登录成功
        await this.ctx.model.Security.LoginRecord.updateOne(
            { ip: this.ctx.ip }, 
            { 
                $set: { loginTimes: 0 }, 
            },
        );
        await this.ctx.model.Security.User.findByIdAndUpdate(
            { _id: userInfo._id }, 
            { 
                $inc: { loginTimes: 1 },
                $set: { lastLogin: new Date() }, 
            },
        );
        
        Object.assign(result, {
            id: userInfo.id,
            roleIds: userInfo.roleIds,
            loginName: userInfo.loginName,
            realName: userInfo.realName,
            phone: userInfo.phone,            
        });
        this.ctx.session.userInfo = {
            ...result,
        };
        return result;
    }

    /** 
     * @description        检查用户是否被锁定
     * @author              shuxiaokai
     * @create             2020-05-09 15:23   
     * @return {String}    返回字符串
     */

    async checkIsLockIP() {
        const loginRecord = await this.ctx.model.Security.LoginRecord.findOne({ ip: this.ctx.ip });
        if (loginRecord && loginRecord.loginTimes > 10) { //登录次数超过4次
            this.ctx.helper.errorInfo("ip锁定", 2007);
        }
        return loginRecord;
    }
    /** 
     * @description        检查登录次数
     * @author              shuxiaokai
     * @create             2020-05-09 15:07
     */

    async addLoginTimes() {
        const result = await this.ctx.model.Security.LoginRecord.updateOne(
            { ip: this.ctx.ip }, 
            { 
                $set: { ip: this.ctx.ip, userAgent: this.ctx.headers["user-agent"] },
                $inc: { loginTimes: 1 }
            },
            { upsert: true }
        );
        return result.loginTimes;
    }
    /** 
        @description  用户登录（手机号验证码）
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @params {String}            phone 手机号
        @params {String}            smsCode 验证码
        @return       null
    */

    async loginWithPhone(params) {
        const { phone, smsCode } = params;
        const result = {};

        const smsInfo = await this.ctx.model.Security.Sms.findOne({ phone });

        if (!smsInfo) {
            this.ctx.helper.errorInfo("请输入正确的手机号码", 2005);
        }
        if (smsInfo.smsCode !== smsCode) {
            this.ctx.helper.errorInfo("短信验证码错误", 2004);
        }

        const userInfo = await this.ctx.model.Security.User.findOne({ phone });
        if (!userInfo) {
            this.ctx.helper.errorInfo("当前用户不存在", 2004);
        }

        Object.assign(result, {
            id: userInfo.id,
            roleIds: userInfo.roleIds,
            loginName: userInfo.loginName,
            realName: userInfo.realName,
            phone: userInfo.phone,            
        });
        this.ctx.session.userInfo = {
            ...result
        };
        return result;
    }

    /** 
        @description  修改用户权限
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @params {String}         _id 
        @params {String}         loginName 
        @params {String}         phone 
        @params {String}         department 
        @params {String}         title 
        @params {Array<string>}  roleIds //角色ids
        @params {Array<string>}  roleNames //角色名称
        @return       null
    */

    async changeUserPermission(params) { 
        const { _id, roleIds, roleNames, loginName, phone, department, title, qq } = params;
        const updateDoc = {};
        updateDoc.roleIds = roleIds;
        updateDoc.roleNames = roleNames;
        updateDoc.loginName = loginName;
        updateDoc.phone = phone;
        updateDoc.department = department;
        updateDoc.title = title;
        updateDoc.qq = qq;
        await this.ctx.model.Security.User.findByIdAndUpdate({ _id }, updateDoc);
        return;
    }
    /* 
        @description  删除用户
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @params {Array<String>}      ids id数组
        @return       null
    */
    async deleteUser(params) {
        const { ids } = params;
        const result = await this.ctx.model.Security.User.updateMany({ _id: { $in: ids }}, { $set: { enable: false }});
        return result;
    }
    /** 
        @description  获取用户
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @params {String?}           loginName 登录名称
        @params {String?}           realName 真实姓名
        @params {String?}           phone 手机号码
        @params {String?}           title 职位
        @params {String?}           department 部门
        @params {Number?}           pageNum 当前页码
        @params {Number?}           pageSize 每页大小   
        @params {number?}           startTime 创建日期     @remark 默认精确到毫秒       
        @params {number?}           endTime 结束日期       @remark 默认精确到毫秒
        @return       null
    */

    async getUserList(params) {
        const { pageNum, pageSize, startTime, endTime, loginName, realName, phone, title, department } = params;
        const query = {};
        let skipNum = 0;
        let limit = 100;
        if (pageSize != null && pageNum != null) {
            skipNum = (pageNum - 1) * pageSize;
            limit = pageSize;
        }
        if (startTime != null && endTime != null) {
            query.createdAt = { $gt: startTime, $lt: endTime };
        }
        if (loginName) {
            query.loginName = new RegExp(escapeStringRegexp(loginName));
        }
        if (realName) {
            query.realName = new RegExp(escapeStringRegexp(realName));
        }
        if (phone) {
            query.phone = new RegExp(escapeStringRegexp(phone));
        }
        if (title) {
            query.title = new RegExp(escapeStringRegexp(title));
        }
        if (department) {
            query.department = new RegExp(escapeStringRegexp(department));
        }
        const rows = await this.ctx.model.Security.User.find(query, { password: 0, salt: 0, clientRoutes: 0, clinetMenus: 0, serverRoutes: 0, starProjects: 0 }).skip(skipNum).limit(limit);
        const total = await this.ctx.model.Security.User.find(query).countDocuments();
        const result = {};
        result.rows = rows;
        result.total = total;
        return result;
    }

    /**
        @description  修改用户状态
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @params {String}      _id 
        @params {Boolean}     enable 
        @return       null
    */

    async changeUserState(params) { 
        const { _id, enable } = params;
        const result = await this.ctx.model.Security.User.findByIdAndUpdate({ _id }, { $set: { enable }});
        return result;
    }

    /** 
     * @description        修改用户密码
     * @author              shuxiaokai
     * @create             2020-09-01 11:25
     * @param {String}     oldPassword - 原始密码       
     * @param {String}     newPassword - 新密码       
     * @return {null}      返回null
     */

    async changeUserPassword(params) { 
        const { oldPassword, newPassword } = params;
        const _id = this.ctx.session.userInfo.id;
        const matchString = /[a-zA-Z]/;
        const matchNumber = /\d/;
        const inValidKey = /[^\w\d!@#]/;
        if (newPassword.match(inValidKey)) {
            this.ctx.helper.errorInfo("密码存在非法字段", 1007);
        }
        if (!newPassword.match(matchString) || !newPassword.match(matchNumber) || newPassword.length < 8) {
            this.ctx.helper.errorInfo("密码长度和格式不正确", 1007);
        }
        //=========================================================================//        
        const userInfo = await this.ctx.model.Security.User.findOne({ _id });
        const hash = crypto.createHash("md5");
        hash.update((oldPassword + userInfo.salt).slice(2));
        const hashPassword = hash.digest("hex");
        if (userInfo.password !== hashPassword) {
            this.ctx.helper.errorInfo("原密码错误", 2009);
        }

        const hash2 = crypto.createHash("md5");
        const newHashPassword = hash2.update((newPassword + userInfo.salt).slice(2)).digest("hex");


        await this.ctx.model.Security.User.findByIdAndUpdate({ _id }, { $set: { password: newHashPassword }});
        return;
    }

    /**
        @description  获取用户基本信息
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @return       null
    */
   
    async getUserBaseInfo() {
        const userInfo = this.ctx.session.userInfo;
        const roleIds = userInfo.roleIds; //用户所有角色信息
        const allClientRoutes = await this.ctx.model.Security.ClientRoutes.find({}, { name: 1, path: 1 }); //系统所有前端路由
        const allClientMenu = await this.ctx.model.Security.ClientMenu.find({}, { name: 1, path: 1, sort: 1 }); //系统所有前端菜单
        let clientRoutesResult = [];
        let clientBannerResult = []; 
        console.log(222, roleIds)
        for (let i = 0; i < roleIds.length; i++) {
            const roleInfo = await this.ctx.model.Security.Role.findById({ _id: roleIds[i] });
            //前端路由
            const clientRoutes = roleInfo.clientRoutes.map(val => {
                return allClientRoutes.find(val2 => {
                    return val2._id.toString() === val;
                });
            });
            clientRoutesResult = clientRoutesResult.concat(clientRoutes);
            //前端菜单
            const clientBanner = roleInfo.clientBanner.map(val => {
                return allClientMenu.find(val2 => {
                    return val2._id.toString() === val;
                });
            });
            clientBannerResult = clientBannerResult.concat(clientBanner);
        }
        clientRoutesResult = this.ctx.helper.unique(clientRoutesResult, "id");
        clientBannerResult = this.ctx.helper.unique(clientBannerResult, "id");
        return {
            ...userInfo,
            clientBanner: clientBannerResult.sort((a, b) => {
                return b.sort - a.sort;
            }),
            clientRoutes: clientRoutesResult
        };
    }

    /**
        @description  获取用户信息(通过id)
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @param {String}           id 用户id
        @return       null
    */

    async getUserInfoById(params) {
        const { _id } = params;
        const result = await this.ctx.model.Security.User.findById({ _id }, { enable: 0, password: 0, salt: 0, clientRoutes: 0, clinetMenus: 0, serverRoutes: 0, starProjects: 0 });
        return result;
    }

    /** 
     * @description        获取用户信息
     * @author              shuxiaokai
     * @return {String}    返回字符串
     */

    async getUserInfo() {
        const _id = this.ctx.session.userInfo.id;
        const result = await this.ctx.model.Security.User.findById({ _id },
            { 
                enable: 0,
                roleIds: 0,
                roleNames: 0,
                loginTimes: 0,
                password: 0,
                salt: 0,
                clientRoutes: 0,
                clinetMenus: 0,
                serverRoutes: 0,
                starProjects: 0,
                accessProjects: 0,
                __v: 0,
            }
        );

        return result;
    }

    /**
        @description  通过名称获取用户列表
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @param {String}     name 用户真实名称或者登录名
        @return       null
    */

    async getUserListByName(params) {
        const { name } = params;
        if (!name) {
            return [];
        }
        const escapeName = escapeStringRegexp(name);
        const userList = await this.ctx.model.Security.User.find({ $or: [
            {
                realName: { $regex: escapeName },
            },
            {
                loginName: { $regex: escapeName }
            }
        ] }, { realName: 1, loginName: 1 }).lean();
        const result = userList.map(val => {
            return {
                realName: val.realName,
                loginName: val.loginName,
                userId: val._id,
            };
        });
        return result;
    }
    /**
        @description  通过excel批量导入用户
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @param {String}     filePath excel路径
        @return       null
    */

    async addUserByExcel(params) {
        const { filePath } = params;
        const workbook = XLSX.readFile(filePath);
        const sheetname = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetname];
        const sheetJson = XLSX.utils.sheet_to_json(worksheet);
        const userDocs = [];
        const userNum = sheetJson.length;
        let validNum = 0;
        for (let i = 0; i < sheetJson.length; i++) {
            const user = sheetJson[i];
            const loginName = user["登录名称"];
            const phone = user["手机号码"];
            const realName = user["真实姓名"];
            const title = user["职位"];
            const department = user["部门"];
            const qq = user["qq号"];
            const password = "111111";
            const doc = {};
            const hasUser = await this.ctx.model.Security.User.findOne({ $or: [{ loginName }, { phone }] }); 
            if (!hasUser && loginName && user && phone && realName) {
                const hash = crypto.createHash("md5");
                const salt = this.ctx.helper.rand(10000, 9999999).toString();
                hash.update((password + salt).slice(2));
                const hashPassword = hash.digest("hex");
                doc.loginName = loginName;
                doc.realName = realName;
                doc.phone = phone;
                doc.password = hashPassword;
                doc.salt = salt;
                doc.title = title;
                doc.department = department;
                doc.qq = qq;
                userDocs.push(doc);
                validNum++;
            }
        }
        await this.ctx.model.Security.User.insertMany(userDocs); 
        return {
            total: userNum,
            success: validNum,
        };
    }
    /** 
     * @description        添加最近访问页面
     * @author             shuxiaokai
     * @create             2020-12-18 16:41
     * @param {any}        projectId - 项目id       
     * @return {null}      返回null
     */
    async addLastVisit(params) {
        const { projectId } = params;
        const MAX_RECENT_VISIT = 5;
        const userInfo = this.ctx.session.userInfo;
        const recentVisit = await this.ctx.model.Security.User.findOne({ _id: userInfo.id }, { recentVisitProjects: 1 }).lean();
        let recentVisitProjects = recentVisit.recentVisitProjects || [];
        console.log(222, recentVisit, userInfo)
        const matchedVisitProjectIndex = recentVisitProjects.findIndex(val => val === projectId);
        if (matchedVisitProjectIndex  !== -1) { //匹配到数据则直接交换
            recentVisitProjects.splice(matchedVisitProjectIndex, 1);
            recentVisitProjects.unshift(projectId);
        } else {
            recentVisitProjects.unshift(projectId);
        }
        recentVisitProjects = recentVisitProjects.slice(0, MAX_RECENT_VISIT);
        const result = await this.ctx.model.Security.User.findByIdAndUpdate({ _id: userInfo.id }, {
            $set: { 
                recentVisitProjects
            }
        }, { new: true }); 
        return result.recentVisitProjects;
    }
    /** 
     * @description        收藏项目
     * @author             shuxiaokai
     * @create             2020-12-18 16:41
     * @param {any}        projectId - 项目id       
     * @return {null}      返回null
     */
    async starProject(params) {
        const { projectId } = params;
        const userInfo = this.ctx.session.userInfo;
        await this.ctx.model.Security.User.findByIdAndUpdate({ _id: userInfo.id }, {
            $addToSet: { 
                starProjects: projectId
            }
        }); 
        return {};
    }
    /** 
     * @description        取消收藏项目
     * @author             shuxiaokai
     * @create             2020-12-18 16:41
     * @param {any}        projectId - 项目id       
     * @return {null}      返回null
     */
    async unStarProject(params) {
        const { projectId } = params;
        const userInfo = this.ctx.session.userInfo;
        await this.ctx.model.Security.User.findByIdAndUpdate({ _id: userInfo.id }, {
            $pull: { 
                starProjects: projectId
            }
        }); 
        return {};
    }
    
}

module.exports = userService;