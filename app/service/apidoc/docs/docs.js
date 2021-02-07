/* eslint-disable camelcase */

/** 
    @description  docs相关service
    @author       shuxiaokai
    @create        2020-10-08 22:10
*/


const Service = require("egg").Service;
const officegen = require("officegen");
const fs = require("fs-extra");
const path = require("path")
const xss = require("xss");

class DocsService extends Service {
    /** 
     * @description        检查是否有权限操作接口
     * @author             shuxiaokai
     * @create             2021-01-13 11:10
     * @param {string}     projectId 项目id
     * @return {boolean}   true代表有权限 false代表无权限
     */
    async checkOperationDocPermission(projectId) {
        const userInfo = this.ctx.session.userInfo;
        const projectInfo = await this.ctx.model.Apidoc.Project.Project.findById({ _id: projectId });
        if (!projectInfo) {
            this.ctx.helper.errorInfo("暂无当前项目权限", 4002);
        }
        const accessUsers = projectInfo.members.concat([projectInfo.owner])
        if (!accessUsers.find(user => user.id === userInfo.id)) {
            this.ctx.helper.errorInfo("暂无当前项目权限", 4002);
        }
    }
    /** 
        @description  新增空白文档
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @param {string}            name 文档名称
        @param {string}            type 文档类型 
        @param {string}            pid 父元素id
        @param {string}            projectId 项目id
        @return       null
    */
    async addEmptyDoc(params) {
        const { name, type, pid, projectId} = params;
        await this.ctx.service.apidoc.docs.docs.checkOperationDocPermission(projectId);
        if (pid) { //不允许在非folder类型文档下面插入文档
            const parentDoc = await this.ctx.model.Apidoc.Docs.Docs.findOne({ _id: pid });
            if (parentDoc.info.type !== "folder") {
                this.ctx.helper.errorInfo("操作不被允许，文件下面不允许嵌套文件夹", 4001);
            }
        }
        const doc = {
            pid,
            projectId,
            isFolder: type === "folder",
            sort: Date.now(),
            info: {
                name,
                type,
            }
        }
        const result = await this.ctx.model.Apidoc.Docs.Docs.create(doc);
        const docLen = await this.ctx.model.Apidoc.Docs.Docs.find({ projectId, isFolder: false, enabled: true }).countDocuments();
        await this.ctx.model.Apidoc.Project.Project.findByIdAndUpdate({ _id: projectId }, { $set: { docNum: docLen }}); //新增文档
        return {
            ...result.item,
            ...result.info,
            _id: result._id,
            pid: result.pid,
            sort: result.sort,
            isFolder: result.isFolder,
            children: result.children,
        };
    }
    /** 
     * @description        拷贝一个节点
     * @author              shuxiaokai
     * @updateAuthor       shuxiaokai
     * @create             2020-02-15 22:29
     * @update             2020-02-15 22:29
     * @param {String}     _id - 节点id    
     * @param {String}     projectId - 项目id    
     */

    async copyDoc(params) {
        const { _id, projectId } = params;
        await this.ctx.service.apidoc.docs.docs.checkOperationDocPermission(projectId);
        let doc = await this.ctx.model.Apidoc.Docs.Docs.findOne({ _id }).lean();
        doc.info.name = "副本-" + doc.info.name;
        doc._id = this.app.mongoose.Types.ObjectId();
        doc.sort += 1;
        const result = await this.ctx.model.Apidoc.Docs.Docs.create(doc);
        if (!doc.isFolder) {
            await this.ctx.model.Apidoc.Project.Project.findByIdAndUpdate({ _id: doc.projectId }, { $inc: { docNum: 1 }});
        }
        return {
            ...result.item,
            ...result.info,
            _id: result._id,
            pid: result.pid,
            sort: result.sort,
            isFolder: result.isFolder,
            children: result.children,
        };
    }

    /** 
        @description  新增多个空白文档
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @param {String}        projectId 项目id
        @param {String}        pid 文档父元素
        @param {String}        name 接口名称
        @param {String}        host 接口host
        @param {String}        url 接口url
        @param {String}        templateId 模板id 
        @return       null
    */

    async newMultiDoc(params) {
        const { projectId, pid, name, host, url, templateId } = params;
        // const doc = {
        //     docName: name,
        //     isFolder: false,
        //     pid,
        //     projectId,
        //     ancestors: [...ancestors],
        //     sort: Date.now(),
        //     item: item || {}
        // };        
        // for (let i = 0; i < 4; i++) {
            
        // }



        const result = await this.ctx.model.Apidoc.Docs.DocsRestfulTemplate.findOne({ _id: templateId });
        return result;
    }

    /** 
     * @description        新增多个文档
     * @author              shuxiaokai
     * @create             2020-07-20 15:36
     * @param {string}     projectId - 数字类型       
     * @return {String}    返回字符串
     */

    async addMultiDocs(params) {
        const { docs, projectId } = params;
        docs.forEach(val => {
            val._id = this.app.mongoose.Types.ObjectId();
        });
        docs.forEach(val => {
            val.projectId = projectId;
            if (val.pid) {
                const matchDoc = docs.find(doc => doc.uuid === val.pid);
                val.pid = matchDoc._id.toString();
            }
        });
        const resultDocs = await this.ctx.model.Apidoc.Docs.Docs.insertMany(docs);
        const docsLength = resultDocs.filter(val => !val.isFolder).length;
        await this.ctx.model.Apidoc.Project.Project.update({ _id: projectId }, { $inc: { docNum: docsLength }});
        const record = {
            operation: "import",
            projectId,
            docInfo: []
        };
        docs.forEach(val => {
            record.docInfo.push({
                docName: val.docName,
                isFolder: val.isFolder,
                method: val.item && val.item.methods,
                url: val.item && val.item.url && val.item.url.path,
            });
        });
        await this.ctx.service.apidoc.docs.docsHistory.addDocHistory(record);
        return;
    }

    /** 
        @description  修改文档在文档树中的位置
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @param {String}      _id 当前文档id
        @param {String}      pid 父文档id
        @param {String}      sort 排序
        @return       null
    */

    async changeDocPosition(params) { 
        const { _id, pid, sort } = params;
        const updateDoc = { $set: {}};
        let parentDoc = null;
        let isFolder = null;
        updateDoc.$set.pid = pid;
        updateDoc.$set.sort = sort;
        if (pid) {
            parentDoc = await this.ctx.model.Apidoc.Docs.Docs.findById({ _id: pid });
            isFolder = parentDoc.isFolder;
        }
        if (parentDoc && !isFolder) {
            this.ctx.helper.errorInfo("操作不被允许，pid对应的父元素不是文件夹", 4001);
        }
        await this.ctx.model.Apidoc.Docs.Docs.findByIdAndUpdate({ _id }, updateDoc);
        return;
    }

    /** 
        @description  修改文档名称
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @param {String}    _id 当前文档id      
        @param {String}    name 当前文档名称      
        @return       null
    */
    async changeDocName(params) { 
        const { _id, name, projectId } = params;
        await this.ctx.service.apidoc.docs.docs.checkOperationDocPermission(projectId);
        await this.ctx.model.Apidoc.Docs.Docs.findByIdAndUpdate({ _id }, { $set: { "info.name": name }});
        return { _id };
    }
    /** 
        @description  新增文档详细信息
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @param {pbjectID}         _id 文档id
        @param {object}           info 接口基本信息 
        @param {object}           item 录入参数 
        @param {string}           projectId 项目id 
        @return       null
    */

    async fillDoc(params) {
        const { _id, info, item, projectId } = params;
        await this.ctx.service.apidoc.docs.docs.checkOperationDocPermission(projectId);
        info.description = xss(info.description)
        await this.ctx.model.Apidoc.Docs.Docs.findByIdAndUpdate({ _id }, { $set: { item, info } }, { new: true });
        return;
    }
    /** 
        @description  获取文档结构树
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @param {string}          projectId 文档id
        @return       null
    */
    async getDocTreeNode(params) { 
        const { projectId } = params;
        await this.ctx.service.apidoc.docs.docs.checkOperationDocPermission(projectId);
        const result = [];
        const docsInfo = await this.ctx.model.Apidoc.Docs.Docs.find({
            projectId: projectId,
            enabled: true
        }, {
            pid: 1,
            info: 1,
            "item.method": 1,
            isFolder: 1,
            sort: 1,
        }).sort({
            isFolder: -1,
            sort: 1
        }).lean();
        const mapedData =  docsInfo.map(val => {
            return {
                ...val.item,
                ...val.info,
                _id: val._id,
                pid: val.pid,
                sort: val.sort,
                isFolder: val.isFolder,
                children: val.children,
            };
        })
        for (let i = 0; i < mapedData.length; i++) {
            const docInfo = mapedData[i];
            if (!docInfo.pid) { //根元素
                docInfo.children = [];
                result.push(docInfo);
            }
            const id = docInfo._id.toString();
            for (let j = 0; j < mapedData.length; j++) {
                if (id === mapedData[j].pid) { //项目中新增的数据使用标准id
                    if (docInfo.children == null) {
                        docInfo.children = [];
                    }
                    docInfo.children.push(mapedData[j]);
                }
            }
        }
        return result;
    }
    /** 
        @description  获取文档详细信息
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @param {string}           _id 文档id
        @param {string}           projectId 文档id
        @return       null
    */
    async getDocDetail(params) { 
        const { _id, projectId } = params;
        await this.ctx.service.apidoc.docs.docs.checkOperationDocPermission(projectId);
        const result = await this.ctx.model.Apidoc.Docs.Docs.findOne({ _id, enabled: true }, { pid: 0, isFolder: 0, sort: 0, enabled: 0 });
        return result;
    }
    /** 
        @description  根据url过滤文档信息
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @param {string}         projectId 项目id
        @param {string}         url 文档url
        @return       null
    */

    async filterDoc(params) { 
        const { projectId, url } = params;
        if (!url) {
            return [];
        }
        const searchName = await this.ctx.model.Apidoc.Docs.Docs.find({ projectId, "item.url.path": new RegExp(url, "i") }, { _id: 1, docName: 1 });
        const searchUrl = await this.ctx.model.Apidoc.Docs.Docs.find({ projectId, docName: new RegExp(url, "i") }, { _id: 1, docName: 1 });
        const result = [].concat(searchName, searchUrl);
        return result;
    }
    


    /** 
        @description  删除文档
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @param {ObjectID}           _id 文档id
        @return       null
    */

    async deleteDoc(params) { 
        const { ids, projectId } = params;
        const result = await this.ctx.model.Apidoc.Docs.Docs.updateMany({ projectId, _id: { $in: ids }}, { $set: { enabled: false }}); //文档祖先包含删除元素，那么该文档也需要被删除
        const docLen = await this.ctx.model.Apidoc.Docs.Docs.find({ projectId, isFolder: false, enabled: true }).countDocuments();
        await this.ctx.model.Apidoc.Project.Project.findByIdAndUpdate({ _id: projectId }, { $set: { docNum: docLen }}); //删除文档
        const deleteDocs = await this.ctx.model.Apidoc.Docs.Docs.find({ projectId, _id: { $in: ids }});
        const record = {
            operation: deleteDocs.length > 1 ? "deleteMany" : (deleteDocs[0].isFolder ? "deleteFolder" : "deleteDoc"),
            projectId: deleteDocs[0].projectId,
            docInfo: []
        };
        deleteDocs.forEach(val => {
            record.docInfo.push({
                docName: val.docName,
                isFolder: val.isFolder,
                method: val.item && val.item.methods,
                url: val.item && val.item.url && val.item.url.path,
            });
        });
        await this.ctx.service.apidoc.docs.docsHistory.addDocHistory(record);
        return result;
    }

    /**
        @description  生成文件word
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @params {String}            projectId 项目id
        @return       null
    */

    async convertDocToWord(params) { 
        const { projectId } = params;
        const docs = await this.ctx.model.Apidoc.Docs.Docs.find({ projectId, isFolder: false, enabled: true });
        const docx = officegen("docx");
        
        docs.forEach(doc => {
            //添加标题
            let pObj = docx.createP({ align: "center" });
            pObj.addText(doc.docName, {
                font_size: 28,
                align: "center"
            });
            //添加请求方式
            pObj = docx.createP();
            pObj.addText("基本信息", {
                font_size: 16,
                color: "teal"
            });              
            //添加请求方式
            pObj = docx.createP();
            pObj.addText(`请求方式：${doc.item.methods}`, {
                font_size: 14,
            });  
            //添加请求路径
            pObj.addLineBreak();    
            pObj.addText(`请求路径：${doc.item.url.path}`, {
                font_size: 14,
            });  
            //添加备注
            pObj.addLineBreak();    
            pObj.addText(`备注：${doc.item.description}`, {
                font_size: 14,
            });   
            pObj.addLineBreak();

            //添加请求参数
            pObj.addText(`请求参数`, {
                font_size: 16,
                color: "teal"
            });   
            pObj = docx.createP({ backline: "E0E0E0" });
            const requestParams = this.ctx.helper.convertDocParams(doc.item.requestParams);
            pObj.addText(`${requestParams.str}`);
            //返回参数
            pObj = docx.createP();
            pObj.addText(`返回参数`, {
                font_size: 16,
                color: "teal"
            });   
            pObj = docx.createP({ backline: "E0E0E0" });
            const responseParams = this.ctx.helper.convertDocParams(doc.item.responseParams);
            pObj.addText(`${responseParams.str}`);

            // pObj = docx.createP();
            // pObj.addHorizontalLine();
            // pObj.addHorizontalLine();    
        });
        const writeStream = fs.createWriteStream("demo.docx");
        return new Promise((resolve, reject) => {
            writeStream.on("finish", () => {
                const fileName = "demo.docx";
                this.ctx.response.attachment(fileName);
                this.ctx.set("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
                this.ctx.set("Content-disposition", `attachment; filename=${fileName}`);
                this.ctx.set("Access-Control-Expose-Headers", "Content-disposition");
                this.ctx.body = fs.createReadStream("demo.docx");
                // this.ctx.body = docs;
                resolve();
            });
            docx.on("error", err => {
                reject(err);
            });
            writeStream.on("error", err => {
                reject(err);
            });
            docx.generate(writeStream);
        });
    }
    /** 
        @description  发布文档
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @param {String}    _id 当前文档id      
        @return       null
    */

    async publishDoc(params) { 
        const { _id } = params;
        const publisher = this.ctx.session.userInfo.realName;
        
        const result = await this.ctx.model.Apidoc.Docs.Docs.findByIdAndUpdate({ _id }, { 
            $set: { publish: true },
            $push: {
                publishRecords: {
                    publisher,
                    time: new Date()
                }
            }
        });
        return result;
    }

    /**
        @description  获取mock文档数据
        @author       shuxiaokai
        @create        2020-10-08 22:10
        @params {String}   _id 文档id
        @return       null
    */

    async getMockData(params) { 
        const { _id } = params;
        const doc = await this.ctx.model.Apidoc.Docs.Docs.findOne({ _id, enabled: true }).lean();
        const result = this.convertPlainParamsToTreeData(doc.item.responseParams);
        return result;
    }
    
    /** 
     * @description        mock数据转换
     * @author              shuxiaokai
     * @create             2020-09-01 16:01
     * @return {String}    返回字符串
     */

    convertPlainParamsToTreeData(plainData, jumpChecked) {
        const result = {};
        const foo = (plainData, result) => {
            for (let i = 0, len = plainData.length; i < len; i++) {
                if (jumpChecked && !plainData[i]._select) { //若请求参数未选中则不发送请求
                    continue;
                }
                const key = plainData[i].key.trim();
                const value = plainData[i].value;
                const type = plainData[i].type;
                const resultIsArray = Array.isArray(result);
                const isComplex = (type === "object" || type === "array");
                let arrTypeResultLength = 0; //数组类型值长度，用于数组里面嵌套对象时候对象取值
                if (!isComplex && (key === "" || value === "")) { //非复杂数据需要填写参数名称才可以显示
                    continue;
                }
                /*eslint-disable indent*/ 
                switch (type) {
                    case "number": //数字类型需要转换为数字，转换前所有值都为字符串
                        resultIsArray ? result.push(Number(value)) : result[key] = Number(value);
                        break;
                    case "boolean": //字符串类型不做处理
                        resultIsArray ? result.push(result[key] = (value === "true" ? true : false)) : (result[key] = (value === "true" ? true : false));
                        break;
                    case "object":
                        resultIsArray ? (arrTypeResultLength = result.push({})) : (result[key] = {});
                        if (plainData[i].children && plainData[i].children.length > 0) {
                            foo(plainData[i].children, resultIsArray ? (result[arrTypeResultLength - 1]) : result[key]);
                        }
                        break;
                    case "array":
                        result[key] = [];
                        if (plainData[i].children && plainData[i].children.length > 0) {
                            foo(plainData[i].children, result[key]);
                        }
                        break;
                    default: //字符串或其他类型类型不做处理
                        resultIsArray ? result.push(value) : (result[key] = value);
                        break;
                }
            }
        }
        foo(plainData, result);
        return result;
    }
    /** 
     * @description        获取所有接口离线数据
     * @author              shuxiaokai
     * @create             2020-11-13 09:24
     * @param  {String}    projectId 项目id
     * @return {String}    返回字符串
     */
    async getDocOfflineData(params) { 
        const { projectId } = params;
        const banner = await this.ctx.service.apidoc.docs.docs.getDocTreeNode({ projectId });
        const docs = await this.ctx.model.Apidoc.Docs.Docs.find({ projectId, enabled: true }, { item: 1, _id: 1, docName: 1, createdAt: 1, updatedAt: 1, pid: 1 });
        const result = {
            banner,
            docs
        };
        let file = await fs.readFile(path.resolve(this.app.baseDir, "app/public/share-doc/index.html"), "utf-8");
        file = file.replace(/window.SHARE_DATA = null/, `window.SHARE_DATA = ${JSON.stringify(result)}`);
        file = file.replace(/window.PROJECT_ID = null/, `window.PROJECT_ID = "${projectId}"`);
        this.ctx.set("content-type", "application/force-download");
        this.ctx.set("content-disposition", `attachment;filename=${encodeURIComponent("接口文档.html")}`);
        return file;
    }
}

module.exports = DocsService;