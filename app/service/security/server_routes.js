/**
    @description  后端资源service
    @author       shuxiaokai
    @create        2020-10-08 22:10
*/

const Service = require("egg").Service;

class serverRoutesService extends Service {
    /**
        @description  新增后端资源
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @params {String}            path 后端路由
        @params {String}            name 路由名称
        @params {String}            method 请求方法
        @params {String}            groupName 分组名称
        @remark                     请求方法和请求地址唯一确定一个请求
        @return       null
    */

    async addServerRoutes(params) {
        const { name, path, method, groupName } = params;
        const doc = {};
        doc.name = name;
        doc.path = path;
        doc.method = method;
        doc.groupName = groupName;

        const hasPath = await this.ctx.model.Security.ServerRoutes.findOne({ path, method });
        if (hasPath) {
            this.ctx.helper.errorInfo("路由已经存在", 1003);
        }
        await this.ctx.model.Security.ServerRoutes.create(doc);
        return;
    }

    /**
        @description  修改后端路由
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @params {String}      _id 
        @params {String}      name 路由名称 
        @params {String}      path 路由地址
        @params {String}      method 请求方式
        @params {String}      groupName 分组名称
        @return       null
    */

    async editServerRoutes(params) { 
        const { _id, name, path, method, groupName } = params;
        const updateDoc = {};
        if (name) {
            updateDoc.name = name; 
        }
        if (path) {
            updateDoc.path = path; 
        }
        if (method) {
            updateDoc.method = method; 
        }
        if (groupName) {
            updateDoc.groupName = groupName; 
        }
        const hasPath = await this.ctx.model.Security.ServerRoutes.findOne({ _id: { $ne: _id }, path, method });
        if (hasPath) {
            this.ctx.helper.errorInfo("路由已经存在", 1003);
        }
        await this.ctx.model.Security.ServerRoutes.findByIdAndUpdate({ _id }, updateDoc);
        return;
    }

    /**
        @description  批量后端路由分类
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @params {String}      ids 路由id组
        @params {String}      groupName 分组名称
        @return       null
    */

    async editMultiServerRoutesType(params) { 
        const { ids, groupName } = params;
        await this.ctx.model.Security.ServerRoutes.updateMany({ _id: { $in: ids }}, { $set: { groupName }});
        return;
    }



    /**
        @description  删除后端资源
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @params {Array<String>}      ids id数组
        @return       null
    */

    async deleteServerRoutes(params) {
        const { ids } = params;
        await this.ctx.model.Security.ServerRoutes.updateMany({ _id: { $in: ids }}, { $set: { enabled: false }});
        return;
    }
    /**
        @description  获取后端资源
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @params {Number?}           pageNum 当前页码
        @params {Number?}           pageSize 每页大小   
        @params {number?}           startTime 创建日期     @remark 默认精确到毫秒       
        @params {number?}           endTime 结束日期       @remark 默认精确到毫秒
        @return       null
    */

    async getServerRoutesList(params) {
        const { pageNum, pageSize, startTime, endTime } = params;
        const query = {};
        let skipNum = 0;
        let limit = 100;
        query.enabled = true;
        if (pageSize != null && pageNum != null) {
            skipNum = (pageNum - 1) * pageSize; 
            limit = pageSize;
        }
        if (startTime != null && endTime != null) {
            query.createdAt = { $gt: startTime, $lt: endTime };
        }
        const rows = await this.ctx.model.Security.ServerRoutes.find(query, { enabled: 0 }).skip(skipNum).limit(limit);
        const total = await this.ctx.model.Security.ServerRoutes.find(query).countDocuments();
        const result = {};
        result.rows = rows;
        result.total = total;
        return result;
    }
    /**
        @description  获取后端资源(不分页)
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @return       null
    */

    async getServerRoutes() {
        const query = {};
        const limit = 1000;
        query.enabled = true;
        const result = await this.ctx.model.Security.ServerRoutes.find(query, { _id: 1, path: 1, name: 1, groupName: 1, method: 1 }).limit(limit);
        return result;
    }
}

module.exports = serverRoutesService;