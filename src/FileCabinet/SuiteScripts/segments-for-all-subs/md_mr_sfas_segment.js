/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/record'],
  /**
   * @param{search} search
   * @param{record} record
   */
  (search, record) => {

    const getInputData = (inputContext) => {
      const subsidiaries = getActiveResults(search.Type.SUBSIDIARY)
      const subsidiaryIds = subsidiaries.map(subsidiary => subsidiary.id);
      const classes = getActiveResults(search.Type.CLASSIFICATION);
      const departments = getActiveResults(search.Type.DEPARTMENT);
      const locations = getActiveResults(search.Type.LOCATION);
      let segments = [];
      segments = segments.concat(classes, departments, locations);
      const inactiveUsedSubs = getInactiveUsedSubs();
      const inputData = [];
      segments.forEach(segment => {
        let additionalSubIds = [];
        inactiveUsedSubs.forEach(inactiveUsedSub => {
          if (segment.id == inactiveUsedSub[segment.recordType]) {
            additionalSubIds.push(inactiveUsedSub.subsidiaryId);
          }
        })
        inputData.push({
          id: segment.id,
          type: segment.recordType,
          subsidiaryIds: subsidiaryIds.concat(additionalSubIds)
        });
      });
      log.debug('inputData', inputData);
      return inputData;
    }

    const getInactiveUsedSubs = () => {
      const searchInactiveUsedSubs = search.create({
        type: "transaction",
        filters:
          [
            ["subsidiary.isinactive", "is", "T"]
          ],
        columns:
          [
            search.createColumn({
              name: "internalid",
              join: "subsidiary",
              summary: "GROUP",
              sort: search.Sort.ASC,
              label: "subsidiaryId"
            }),
            search.createColumn({
              name: "internalid",
              join: "class",
              summary: "GROUP",
              label: "classification"
            }),
            search.createColumn({
              name: "internalid",
              join: "department",
              summary: "GROUP",
              label: "department"
            }),
            search.createColumn({
              name: "internalid",
              join: "location",
              summary: "GROUP",
              label: "location"
            })
          ]
      });
      const pagedData = searchInactiveUsedSubs.runPaged({pageSize: 1000})
      let results = [];
      const columns = searchInactiveUsedSubs.columns;
      pagedData.pageRanges.forEach(pageRange => {
        let pageData = pagedData.fetch({index: pageRange.index}).data;
        pageData.forEach(result => {
          let cleanResult = {};
          columns.forEach(column => {
            cleanResult[column.label] = result.getValue(column);
          })
          results.push(cleanResult);
        })
      });
      log.debug('getInactiveUsedSubs', results);
      return results;

    }


    const getActiveResults = (searchType) => {
      const searchActive = search.create({
        type: searchType,
        filters: [
          search.createFilter({
            name: 'isinactive',
            operator: search.Operator.IS,
            values: false
          })
        ]
      });
      const pagedData = searchActive.runPaged({pageSize: 1000})
      let results = [];
      pagedData.pageRanges.forEach(pageRange => {
        let page = pagedData.fetch({index: pageRange.index});
        results = results.concat(page.data);
      });
      log.debug('getActiveResults', results);
      return results;
    }

    const map = (mapContext) => {
      const mapObj = JSON.parse(mapContext.value);
      const recordId = record.submitFields({
        type: mapObj.type,
        id: mapObj.id,
        values: {
          'subsidiary': mapObj.subsidiaryIds,
          'includechildren': false
        },
        ignoreMandatoryFields: true
      });
      log.debug('updated record', mapObj.type + ': ' + recordId);
    }

    const summarize = (summaryContext) => {
      log.audit('Number of queues', summaryContext.concurrency);
      log.error('Input error', summaryContext.inputSummary.error)
      summaryContext.mapSummary.errors.iterator().each((key, error) => {
        log.error('Map Error for key: ' + key, error);
        return true;
      });
    }

    return {getInputData, map, summarize}

  });
