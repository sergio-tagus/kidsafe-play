export type TourStep = {
  id: string;
  /** Route to navigate to before showing the step. */
  to: string;
  /** data-tour attribute value to spotlight. Null = centered card. */
  anchor: string | null;
  titleKey: string;
  bodyKey: string;
};

export const TOUR_STEPS: TourStep[] = [
  { id: "welcome", to: "/parent", anchor: null, titleKey: "tour.welcome.title", bodyKey: "tour.welcome.body" },
  { id: "overview", to: "/parent", anchor: "overview", titleKey: "tour.overview.title", bodyKey: "tour.overview.body" },
  { id: "children", to: "/parent/children", anchor: "children", titleKey: "tour.children.title", bodyKey: "tour.children.body" },
  { id: "categories", to: "/parent/categories", anchor: "categories", titleKey: "tour.categories.title", bodyKey: "tour.categories.body" },
  { id: "whitelist", to: "/parent/whitelist", anchor: "whitelist", titleKey: "tour.whitelist.title", bodyKey: "tour.whitelist.body" },
  { id: "history", to: "/parent/history", anchor: "history", titleKey: "tour.history.title", bodyKey: "tour.history.body" },
  { id: "pin", to: "/parent", anchor: null, titleKey: "tour.pin.title", bodyKey: "tour.pin.body" },
  { id: "done", to: "/parent", anchor: null, titleKey: "tour.done.title", bodyKey: "tour.done.body" },
];

export const TOUR_COUNT = TOUR_STEPS.length;
