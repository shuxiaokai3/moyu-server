/** 
    @description  参数组service
    @author       shuxiaokai
    @create        2020-10-08 22:10
*/


const Service = require("egg").Service;

class presetParamsService extends Service {
    /** 
        @description  新增参数组
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @param {String}      name //参数名称
        @param {String}      remark //备注
        @param {String}      presetParamsType //参数类型 
        @param {Items}       items //参数属性
        @param {String}      projectId 项目id
        @return       null
    */

    async addPresetParams(params) {
        const { name, remark, presetParamsType, items, projectId } = params;
        await this.ctx.service.apidoc.docs.docs.checkOperationDocPermission(projectId);
        const doc = {};
        const userInfo = this.ctx.session.userInfo;
        doc.name = name;
        doc.remark = remark;
        doc.presetParamsType = presetParamsType;
        doc.items = items;
        doc.projectId = projectId;
        doc.creatorName = userInfo.realName || userInfo.loginName;
        await this.ctx.model.Apidoc.Docs.DocsParamsPreset.create(doc);
        return;
    }

    /** 
        @description  修改自定义组
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @param {String}      _id 参数id
        @param {String}      projectId  项目id
        @param {String}      name 参数组名称
        @param {String}      items 参数信息
        @param {String}      presetParamsType 参数组类型 
        @return       null
    */

    async editPresetParams(params) { 
        const { _id, projectId, name, items, presetParamsType } = params;
        await this.ctx.service.apidoc.docs.docs.checkOperationDocPermission(projectId);
        const updateDoc = {};
        if (name) {
            updateDoc.name = name; 
        }
        if (presetParamsType) {
            updateDoc.presetParamsType = presetParamsType; 
        }
        if (items) {
            updateDoc.items = items; 
        }
        await this.ctx.model.Apidoc.Docs.DocsParamsPreset.findByIdAndUpdate({ _id }, updateDoc);
        return;
    }
    /** 
        @description  删除一个自定义组
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @param {String}            projectId 项目id
        @param {Array<String>}            ids 
        @return       null
    */

    async deletePresetParams(params) {
        const { ids, projectId } = params;
        await this.ctx.service.apidoc.docs.docs.checkOperationDocPermission(projectId);
        const result = await this.ctx.model.Apidoc.Docs.DocsParamsPreset.deleteMany({ _id: { $in: ids }});
        return result;
    }
    /** 
        @description  获取参数组
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @param {Enum<String>}      presetParamsType 当前参数组类型  
        @param {Number?}           pageNum 当前页码
        @param {Number?}           pageSize 每页大小   
        @param {number?}           startTime 创建日期     @remark 默认精确到毫秒       
        @param {number?}           endTime 结束日期       @remark 默认精确到毫秒
        @param {string}            projectId 项目id       
        @return       null
    */

    async getPresetParamsList(params) {
        const { pageNum, pageSize, startTime, endTime, presetParamsType, projectId } = params;
        const query = {};
        let skipNum = 0;
        let limit = 100;
        query.projectId = projectId;
        if (pageSize != null && pageNum != null) {
            skipNum = (pageNum - 1) * pageSize;
            limit = pageSize;
        }
        if (startTime != null && endTime != null) {
            query.createdAt = { $gt: startTime, $lt: endTime };
        }
        if (presetParamsType) {
            query.presetParamsType = presetParamsType;
        }
        const rows = await this.ctx.model.Apidoc.Docs.DocsParamsPreset.find(query, { creatorName: 1, name: 1, presetParamsType: 1 }).skip(skipNum).limit(limit);
        const total = await this.ctx.model.Apidoc.Docs.DocsParamsPreset.find(query).countDocuments();
        const result = {};
        result.rows = rows;
        result.total = total;
        return result;
    }

    /** 
        @description  获取参数组枚举
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @param {Enum<String>}      presetParamsType 当前参数组类型  
        @param {string}            projectId 项目id  
        @return       null
    */

    async getPresetParamsEnum(params) {
        const { projectId } = params;
        const query = {};
        const limit = 100;
        query.projectId = projectId;
        // if (presetParamsType) {
        //     query.presetParamsType = presetParamsType;
        // }
        const result = await this.ctx.model.Apidoc.Docs.DocsParamsPreset.find(query, { items: 1, creatorName: 1, name: 1, presetParamsType: 1 }).limit(limit);
        return result;
    }

    /** 
        @description  获取自定义参数组详情
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @param {String}           projectId 项目id
        @param {String}           _id 当前参数组id
        @return       null
    */
    async getPresetParamsInfo(params) {
        const { projectId, _id } = params;
        await this.ctx.service.apidoc.docs.docs.checkOperationDocPermission(projectId);
        const query = {};
        query._id = _id;
        const result = await this.ctx.model.Apidoc.Docs.DocsParamsPreset.findById(query, { items: 1 });
        return result;
    }
}

module.exports = presetParamsService;