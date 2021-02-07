

/** 
    @description  自定义参数组控制器
    @author       shuxiaokai
    @create        2020-10-08 22:10
*/


const Controller = require("egg").Controller;

class presetParamsController extends Controller {
    /** 
        @description  新增自定义参数组
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @param {String}            name 参数组名称
        @param {enum}              presetParamsType 参数组类型
        @param {Array}             items 参数数据类型
        @param {String}             projectId 项目id
        @return       null
    */

    async addPresetParams() {
        try {
            const params = this.ctx.request.body;
            const reqRule = {
                name: {
                    type: "string"
                },
                presetParamsType: {
                    type: "enum",
                    values: ["queryParams", "requestBody", "responseParams"],
                },
                items: {
                    type: "array"
                },
                projectId: {
                    type: "string"
                }
            };
            this.ctx.validate(reqRule, params);
            const result = await this.ctx.service.apidoc.docs.docsParamsPreset.addPresetParams(params);
            this.ctx.helper.successResponseData(result);
        } catch (error) {
            this.ctx.helper.throwError(error);
            return;
        }
    }

    /** 
        @description  删除一个自定义组
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @param {String}            projectId 项目id
        @param {Array<String>}            ids 
        @return       null
    */

    async deletePresetParams() {
        try {
            const params = this.ctx.request.body;
            const reqRule = {
                projectId: {
                    type: "string",
                },
                ids: {
                    type: "array",
                    itemType: "string"
                },
            };
            this.ctx.validate(reqRule, params);
            const result = await this.ctx.service.apidoc.docs.docsParamsPreset.deletePresetParams(params);
            this.ctx.helper.successResponseData(result);
        } catch (error) {
            this.ctx.helper.throwError(error);
            return;
        }
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

    async editPresetParams() { 
        try {
            const params = this.ctx.request.body;
            const reqRule = {
                _id: {
                    type: "string",
                },
                projectId: {
                    type: "string",
                },
                name: {
                    type: "string",
                    required: false
                },
                items: {
                    type: "array",
                    required: false
                },
                presetParamsType: {
                    type: "string"
                },
            };
            this.ctx.validate(reqRule, params);
            const result = await this.ctx.service.apidoc.docs.docsParamsPreset.editPresetParams(params);
            this.ctx.helper.successResponseData(result);
        } catch (error) {
            this.ctx.helper.throwError(error);
            return;
        }
    }
    /** 
        @description  获取自定义组
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @param {Enum<String>}      presetParamsType 当前参数组类型        
        @param {Number?}           pageNum 当前页码
        @param {Number?}           pageSize 每页大小   
        @param {number?}           startTime 创建日期     @remark 默认精确到毫秒       
        @param {number?}           endTime 结束日期       @remark 默认精确到毫秒
        @param {String}            projectId 项目id
        @return       null
    */

    async getPresetParamsList() { 
        try {
            const params = this.ctx.query;
            const reqRule = {
                presetParamsType: {
                    type: "enum",
                    values: ["queryParams", "requestBody", "responseParams"],
                    required: false,
                },
                pageNum: {
                    type: "number",
                    convertType: "number",
                    required: false
                },
                pageSize: {
                    type: "number",
                    convertType: "number",
                    required: false
                },
                startTime: {
                    type: "number",
                    convertType: "number",
                    required: false
                },
                endTime: {
                    type: "number",
                    convertType: "number",
                    required: false
                },
                projectId: {
                    type: "string"
                }
            };
            this.ctx.validate(reqRule, params);
            const result = await this.ctx.service.apidoc.docs.docsParamsPreset.getPresetParamsList(params);
            this.ctx.helper.successResponseData(result);
        } catch (error) {
            this.ctx.helper.throwError(error);
            return;
        }
    }
    /** 
        @description  获取自定义组
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @param {Enum<String>}      presetParamsType 当前参数组类型
        @param {string}            projectId 项目id       
        @return       null
    */

    async getPresetParamsEnum() { 
        try {
            const params = this.ctx.query;
            const reqRule = {
                // presetParamsType: {
                //     type: "enum",
                //     values: ["header", "request", "response"],
                //     required: false,
                // },
                projectId: {
                    type: "string",
                }
            };
            this.ctx.validate(reqRule, params);
            const result = await this.ctx.service.apidoc.docs.docsParamsPreset.getPresetParamsEnum(params);
            this.ctx.helper.successResponseData(result);
        } catch (error) {
            this.ctx.helper.throwError(error);
            return;
        }
    }



    /** 
        @description  获取自定义参数组详情
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @param {String}           projectId 项目id
        @param {String}           _id 当前参数组id
        @return       null
    */
    async getPresetParamsInfo() { 
        try {
            const params = this.ctx.query;
            const reqRule = {
                projectId: {
                    type: "string"
                },
                _id: {
                    type: "string",
                },
            };
            this.ctx.validate(reqRule, params);
            const result = await this.ctx.service.apidoc.docs.docsParamsPreset.getPresetParamsInfo(params);
            this.ctx.helper.successResponseData(result);
        } catch (error) {
            this.ctx.helper.throwError(error);
            return;
        }
    }
}

module.exports = presetParamsController;
