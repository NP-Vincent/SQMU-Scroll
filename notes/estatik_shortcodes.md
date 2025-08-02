# Estatik Shortcodes

This reference summarizes the WordPress shortcodes provided by the Estatik real estate plugin and their key attributes.

## Property Listings
**Shortcode:** `[es_my_listing]` (alias `[listings]`)

Key attributes include:
- `layout` – display style such as `list`, `grid-3`, or `half_map`.
- `posts_per_page` – number of properties per page.
- `sort` – initial sort order (e.g., `price_high_low`).
- `limit` – show a fixed number of properties without pagination.
- `enable_search` – toggle an embedded search form.
- `map_show` – when `all`, shows a map with all results.
- `authors` – filter by author IDs.

*Example*
```html
[es_my_listing layout="grid" posts_per_page="9" sort="price_low_high"]
```

## Properties Slider
**Shortcode:** `[es_properties_slider]`

Extends `[es_my_listing]` and adds slider options:
- `slides_per_serving` – items visible at once.
- `autoplay` / `autoplay_timeout` – enable automatic slide rotation.
- `is_arrows_enabled` – show navigation arrows.
- `title` – section heading.

## Search Forms
**Shortcode:** `[es_search_form]`

Key attributes include:
- `search_type` – `advanced` or `simple` form layout.
- `layout` – visual arrangement (`vertical`, `horizontal`).
- `search_page_id` – page used for results.
- `address_placeholder` – placeholder text for address input.
- `enable_ajax` – update results without page reload.
- `main_fields`, `collapsed_fields`, `fields` – control which fields appear.

*Example*
```html
[es_search_form search_type="advanced" layout="horizontal" enable_ajax="1"]
```

## Request Form
**Shortcode:** `[es_request_form]`

Key attributes include:
- `layout` – `sidebar` or `section` form style.
- `title`, `background`, `color` – styling options.
- `post_id` – property ID the request concerns.
- `recipient_type` – send to admin or another email.
- `disable_tel`, `disable_name`, `disable_email` – hide fields.

## Single Property
**Shortcode:** `[es_single_property]` (alias `[es_single]`)

Displays full property details.
- `id` – property post ID.

## Property Gallery
**Shortcode:** `[es_property_single_gallery]`

- `id` – property ID.
- `layout` – `slider`, `single-slider`, or `single-tiled-gallery`.

## Property Map
**Shortcode:** `[es_property_single_map]` (alias `[property_single_map]`)

Shows a Google Map for one property.
- `id` – property ID.

*Example*
```html
[es_property_single_map id="123"]
```

To display listings with a map, combine `[es_my_listing]` with half‑map layout:
```html
[es_my_listing layout="half_map" map_show="all"]
```

## Property Field
**Shortcode:** `[es_property_field]`

Outputs a single field value from a property.
- `name` – field key.
- `property_id` – property ID (defaults to current post).
- `default` – fallback when the field is empty.

## Authentication
**Shortcode:** `[es_authentication]`

Key attributes include:
- `auth_item` – element to show (`login-buttons`, `login-form`, `register`).
- `enable_facebook` / `enable_google` – allow social login.
- `enable_login_form` – display standard login form.
- `login_title`, `login_subtitle` – customize headings.
- `enable_buyers_register` – allow buyer registration.

*Example*
```html
[es_authentication auth_item="login-form"]
```

Legacy shortcodes remain available for backward compatibility:
- `[es_login]` – login form.
- `[es_register]` – registration form.
- `[es_reset_pwd]` – password reset form.

## User Profile
**Shortcode:** `[es_profile]`

Shows the logged‑in user’s profile and saved searches. Guests see the authentication form instead.

---
This document is informational and based on Estatik version 4.1.x.
