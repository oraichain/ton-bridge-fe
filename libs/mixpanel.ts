import mixpanel, { Dict, Query } from "mixpanel-browser";

let mixpanelInstance: MixPanel | null = null;

export const getMixPanelClient = () => {
  if (!mixpanelInstance) {
    mixpanelInstance = new MixPanel();
  }
  return mixpanelInstance;
};

class MixPanel {
  constructor() {
    const isProd = process.env.NODE_ENV === "production";
    const token =
      process.env.NEXT_PUBLIC_MIXPANEL_TOKEN ||
      "acbafd21a85654933cbb0332c5a6f4f8";
    mixpanel.init(token);
    //  , {
    //   api_host: process.env.NEXT_PUBLIC_MIXPANEL_API!,
    // }
  }

  identify(id: string) {
    mixpanel.identify(id);
  }

  alias(id: string) {
    mixpanel.alias(id);
  }

  track(event: any, props?: Dict) {
    mixpanel.track(event, props);
  }

  track_links(query: Query, name: string) {
    mixpanel.track_links(query, name, {
      referrer: document.referrer,
    });
  }

  set(props: Dict) {
    mixpanel.people.set(props);
  }
}

export default MixPanel;
