import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Providers } from "./providers";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const markup = renderToStaticMarkup(
  React.createElement(
    Providers,
    null,
    React.createElement("div", null, "content")
  )
);

assert(/content/.test(markup), "Expected providers markup to include children");
assert(
  /data-slot="tooltip-provider"/.test(markup),
  "Expected providers markup to include the tooltip provider"
);
assert(
  /data-sonner-toaster|class="toaster group"/.test(markup),
  "Expected providers markup to include the sonner toaster"
);
