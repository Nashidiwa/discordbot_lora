export interface PingMetrics {
  wsPing: number;
  roundtripPing: number;
}

export class PingService {
  public calculateMetrics(
    wsPing: number,
    sentTimestamp: number,
    replyTimestamp: number,
  ): PingMetrics {
    const roundtripPing = Math.max(0, replyTimestamp - sentTimestamp);
    const normalizedWsPing = Math.max(0, wsPing);

    return {
      wsPing: normalizedWsPing,
      roundtripPing,
    };
  }
}

export const pingService = new PingService();
