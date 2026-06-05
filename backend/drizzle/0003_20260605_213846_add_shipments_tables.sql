CREATE TABLE "shipment_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_id" integer NOT NULL,
	"event_type" varchar(40) NOT NULL,
	"location" varchar(200),
	"description" text,
	"event_time" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"shipment_number" varchar(30) NOT NULL,
	"order_id" integer NOT NULL,
	"customer_id" integer,
	"carrier" varchar(50) NOT NULL,
	"service_type" varchar(30) DEFAULT 'standard' NOT NULL,
	"tracking_number" varchar(100),
	"status" varchar(30) DEFAULT 'pending_pickup' NOT NULL,
	"origin_address" text,
	"destination_address" text,
	"weight_kg" numeric(6, 2),
	"length_cm" numeric(6, 1),
	"width_cm" numeric(6, 1),
	"height_cm" numeric(6, 1),
	"shipping_cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"insurance_value" numeric(10, 2) DEFAULT '0' NOT NULL,
	"signature_required" boolean DEFAULT false NOT NULL,
	"estimated_delivery" timestamp,
	"actual_delivery" timestamp,
	"shipped_at" timestamp,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shipments_shipment_number_unique" UNIQUE("shipment_number"),
	CONSTRAINT "shipments_tracking_number_unique" UNIQUE("tracking_number")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_number" varchar(100);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipped_at" timestamp;--> statement-breakpoint
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;