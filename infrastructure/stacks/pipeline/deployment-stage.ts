import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Stage, AWSRegion } from "../../lib/common-constructs/types";
import { MonitoringStack } from "../../lib/shared/monitoring-stack";
import { NetworkStack } from "../../lib/shared/network-stack";
import { StorageStack } from "../../lib/shared/storage-stack";
import { DataStack } from "../../lib/shared/data-stack";
import { ComputeStack } from "../../lib/shared/compute-stack";
import { VoiceQueueStack } from "../../lib/domains/voice/voice-queue-stack";
import { CrmQueueStack } from "../../lib/domains/crm/crm-queue-stack";
import { CrmSyncStack } from "../../lib/domains/crm/crm-sync-stack";
import { WorkflowQueueStack } from "../../lib/domains/workflow/workflow-queue-stack";

export class DeploymentStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props: { deployEnv: Stage; env: cdk.Environment }) {
    super(scope, id, props);

    const region = props.env.region as AWSRegion;
    const deployProps = {
      deployEnv: props.deployEnv,
      region,
      env: props.env,
    };

    const monitoring = new MonitoringStack(this, "Monitoring", deployProps);

    const network = new NetworkStack(this, "Network", deployProps);
    network.addDependency(monitoring);

    const storage = new StorageStack(this, "Storage", deployProps);
    storage.addDependency(monitoring);

    const data = new DataStack(this, "Data", deployProps);
    data.addDependency(monitoring);

    const voiceQueues = new VoiceQueueStack(this, "VoiceQueues", deployProps);
    voiceQueues.addDependency(monitoring);

    const crmQueues = new CrmQueueStack(this, "CrmQueues", deployProps);
    crmQueues.addDependency(monitoring);

    const workflowQueues = new WorkflowQueueStack(this, "WorkflowQueues", deployProps);
    workflowQueues.addDependency(monitoring);

    const crmSync = new CrmSyncStack(this, "CrmSync", {
      ...deployProps,
      typesenseSyncQueueArn: crmQueues.typesenseSyncQueue.queueArn,
    });
    crmSync.addDependency(crmQueues);

    const compute = new ComputeStack(this, "Compute", {
      ...deployProps,
      vpc: network.vpc,
      securityGroup: network.appSecurityGroup,
      recordingsBucketArn: storage.recordingsBucket.bucketArn,
      queueUrls: {
        callProcessing: voiceQueues.callProcessingQueue.queueUrl,
        workflowJobs: workflowQueues.workflowJobsQueue.queueUrl,
        typesenseSync: crmQueues.typesenseSyncQueue.queueUrl,
      },
    });
    compute.addDependency(network);
    compute.addDependency(storage);
    compute.addDependency(data);
    compute.addDependency(voiceQueues);
    compute.addDependency(crmQueues);
    compute.addDependency(workflowQueues);
    compute.addDependency(crmSync);
  }
}
export default DeploymentStage;
