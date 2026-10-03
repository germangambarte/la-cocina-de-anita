CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    customer_name TEXT NOT NULL,
    menu_name TEXT NOT NULL,

    regular_qty INTEGER NOT NULL DEFAULT 0,
    large_qty INTEGER NOT NULL DEFAULT 0,

    regular_unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    large_unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    food_subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,

    has_delivery BOOLEAN NOT NULL DEFAULT FALSE,
    delivery_time TIME NOT NULL,

    delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,

    is_delivery_paid BOOLEAN NOT NULL DEFAULT FALSE,
    is_ready BOOLEAN NOT NULL DEFAULT FALSE,
    is_delivered BOOLEAN NOT NULL DEFAULT FALSE,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    date DATE NOT NULL DEFAULT CURRENT_DATE,
    concept TEXT NOT NULL,

    category TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'efectivo',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT expenses_amount_positive
        CHECK (amount >= 0),

    CONSTRAINT expenses_category_valid
        CHECK (
            category IN (
                'carne',
                'pescado',
                'verduras_hortalizas',
                'almacen',
                'descartables_envases',
                'servicios',
                'varios'
            )
        ),

    CONSTRAINT expenses_payment_method_valid
        CHECK (
            payment_method IN (
                'efectivo',
                'transferencia',
                'pendiente'
            )
        )
);

CREATE TABLE configs (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cash_boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    start_date DATE NOT NULL,
    initial_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT cash_boxes_initial_balance_positive
        CHECK (initial_balance >= 0)
);

CREATE TABLE cash_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    date DATE NOT NULL DEFAULT CURRENT_DATE,
    concept TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT cash_withdrawals_amount_positive
        CHECK (amount > 0)
);
