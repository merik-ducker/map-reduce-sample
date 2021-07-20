/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/task'],
    /**
     * @param{task} task
 */
    (task) => {

        const afterSubmit = (scriptContext) => {
            const classTask = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: 'customscript_md_mr_sfas_class'
            });
            classTask.submit();
        }

        return {afterSubmit}

    });
