import { Processor, WorkerHost } from "@nestjs/bullmq";

@Processor("zip-generation")
export class ZipProcessor extends WorkerHost {
  async process(job: { data: { slug: string; eventId: string; sessionToken: string } }) {
    return { status: "ready", key: `events/${job.data.slug}/zips/${job.data.sessionToken}.zip` };
  }
}
