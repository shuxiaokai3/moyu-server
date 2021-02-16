/**
    @description  前端菜单service
    @author       shuxiaokai
    @create        2020-10-08 22:10
*/

const Service = require("egg").Service;

class clientMenuService extends Service {
    /**
        @description  新增前端菜单
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @params {String}            name 菜单名称
        @params {String}            path 前端跳转路径
        @params {String}            pid 父级菜单id
        @return       null
    */

    async addClientMenu(params) {
        const { name, path, pid, type } = params;
        const doc = {};
        doc.name = name;
        doc.path = path;
        doc.pid = pid;
        if (type) {
            doc.type = type;
        }
        const hasClientMenu = await this.ctx.model.Security.ClientMenu.findOne({ path });
        if (hasClientMenu) {
            this.ctx.helper.errorInfo("当前菜单路径已存在", 1003);
        }
        const result = await this.ctx.model.Security.ClientMenu.create(doc);
        return { _id: result._id };
    }

    /**
        @description  修改前端菜单
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @params {String}      _id 
        @params {String}      name 菜单名称
        @params {String}      path 前端跳转路径
        @params {String}      type 路由类型( inline前端自己路由  link外部链接 )
        @return       null
    */

    async editClientMenu(params) { 
        const { _id, name, path, type } = params;
        const updateDoc = {};
        if (name) {
            updateDoc.name = name; 
        }
        if (path) {
            updateDoc.path = path; 
        }
        if (type) {
            updateDoc.type = type; 
        }
        const hasClientMenu = await this.ctx.model.Security.ClientMenu.findOne({ _id: { $ne: _id }, name });
        if (hasClientMenu) {
            this.ctx.helper.errorInfo("当前菜单名称已存在", 1003);
        }
        await this.ctx.model.Security.ClientMenu.findByIdAndUpdate({ _id }, updateDoc);
        return;
    }
    /**
        @description  删除前端菜单
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @params {Array<String>}      ids id数组
        @return       null
    */
   
    async deleteClientMenu(params) {
        const { ids } = params;
        const result = await this.ctx.model.Security.ClientMenu.deleteMany({
            $or: [
                { _id: { $in: ids }},
                { pid: { $in: ids }}
            ]
        });
        return result;
    }
    /**
        @description  以树形方式获取前端菜单
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @return       null
    */

    async getTreeClientMenu() {
        const allDocs = await this.ctx.model.Security.ClientMenu.find({ enabled: true }, { type: 1, name: 1, path: 1, pid: 1, sort: 1 }).sort({ sort: -1 });
        const result = [];
        const plainData = allDocs.map(val => {
            return val.toObject();
        });
        for (let i = 0, len = plainData.length; i < len; i++) {
            if (plainData[i].pid == null || plainData[i].pid === "") {
                plainData[i].children = [];
                result.push(plainData[i]);
            }
            const id = plainData[i]._id.toString();
            
            for (let j = 0, len2 = plainData.length; j < len2; j++) {
                if (id === plainData[j].pid) {
                    if (plainData[i].children == null) {
                        plainData[i].children = [];
                    }
                    plainData[i].children.push(plainData[j]);
                }
            }
        }
        return result;
    }
    /** 
        @description  修改菜单在菜单树中的位置
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @param {String}      _id 当前菜单id
        @param {String?}     pid 父菜单id,当将菜单拖入到
        @param {Number}     sort 排序
        @return       null
    */

    async changeClientMenuPosition(params) { 
        const { _id, pid, sort } = params;
        const updateDoc = { $set: {}};
        updateDoc.$set.pid = pid;
        updateDoc.$set.sort = sort;
        await this.ctx.model.Security.ClientMenu.findByIdAndUpdate({ _id }, updateDoc);
        return;
    }

}

module.exports = clientMenuService;